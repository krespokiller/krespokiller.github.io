import * as THREE from 'three';
import { INTERACTIVE_BACKGROUND_CONFIG as CONFIG } from './interactiveBackground.config';

export interface ThemeColorInput {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

interface VolumeBounds {
  halfW: number;
  halfH: number;
  halfZ: number;
}

/**
 * three.js particle network engine for the InteractiveBackground organism.
 *
 * Owns the renderer, camera, particle cloud and link mesh. Positions live in
 * preallocated Float32Array buffers that are written in place every frame
 * (no per-frame allocations); only `needsUpdate` flags are toggled.
 */
export class ParticleNetwork {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();

  private points!: THREE.Points;
  private links!: THREE.LineSegments;
  private pointsMaterial!: THREE.PointsMaterial;
  private linksMaterial!: THREE.LineBasicMaterial;

  // Particle state (all preallocated; counts only change on reseed)
  private count = 0;
  private basePositions: Float32Array = new Float32Array(0);
  private offsets: Float32Array = new Float32Array(0);
  private drifts: Float32Array = new Float32Array(0);
  private renderPositions: Float32Array = new Float32Array(0);
  private positionAttribute!: THREE.BufferAttribute;

  // Pooled link buffers (fixed capacity, filled per frame up to the cap)
  private linkCapacity = CONFIG.LINK_MAX_SEGMENTS;
  private linkPositions: Float32Array = new Float32Array(this.linkCapacity * 2 * 3);
  private linkColors: Float32Array = new Float32Array(this.linkCapacity * 2 * 4);
  private linkIndices: Int32Array = new Int32Array(this.linkCapacity * 2);
  private linkPositionAttribute!: THREE.BufferAttribute;
  private linkColorAttribute!: THREE.BufferAttribute;
  private linkCount = 0;

  // Persistent node bonds: fixed-capacity pair list + dedicated render mesh.
  // Pairs reference particle indices; positions/colors are rewritten per
  // frame from the live render positions (no allocations).
  private bondPairs: Int32Array = new Int32Array(CONFIG.BOND_MAX_COUNT * 2);
  private bondCount = 0;
  private bondPositions: Float32Array = new Float32Array(CONFIG.BOND_MAX_COUNT * 2 * 3);
  private bondColors: Float32Array = new Float32Array(CONFIG.BOND_MAX_COUNT * 2 * 4);
  private bonds!: THREE.LineSegments;
  private bondMaterial!: THREE.LineBasicMaterial;
  private bondPositionAttribute!: THREE.BufferAttribute;
  private bondColorAttribute!: THREE.BufferAttribute;

  private bounds: VolumeBounds = { halfW: 1, halfH: 1, halfZ: 1 };
  private lineColor = new THREE.Color(1, 1, 1);
  private lineAlpha = 0.08;
  private nodeAlpha = 0.04;

  // Per-particle RGBA buffer (RGB fixed at white; alpha carries depth fade).
  // Material color + opacity provide the theme tint and base alpha, so the
  // vertex alpha only has to encode the per-particle fog factor.
  private nodeColors: Float32Array = new Float32Array(0);
  private nodeColorAttribute!: THREE.BufferAttribute;

  // Idle camera drift: animation clock integrated from rAF deltas (never wall
  // time) and a weight that eases toward 1 at rest and 0 while the pointer is
  // active. With dt = 0 (reduced-motion static frame) nothing advances.
  private elapsed = 0;
  private idleWeight = 0;

  // Pointer state, smoothed with exponential damping
  private pointerTarget = new THREE.Vector3();
  private pointerSmoothed = new THREE.Vector3();
  private pointerNdc = new THREE.Vector2();
  private pointerActive = false;
  private parallaxTarget = new THREE.Vector2();

  // Grab & pull: one held node at a time. The drag rides on the per-particle
  // offset system (basePositions are never written by grab logic), so release
  // springs back through the existing offset decay.
  private grabIndex = -1;
  private grabZ = 0;
  private grabTarget = new THREE.Vector3();
  // Scratch screen-space projection caches for the one-shot pick (seed-sized):
  // visual positions AND lattice (base) positions, so a node displaced by the
  // repulsion field or still springing home is grabbable at either spot.
  private screenPositions: Float32Array = new Float32Array(0);
  private screenBasePositions: Float32Array = new Float32Array(0);

  private rafId: number | null = null;
  private tmpVector = new THREE.Vector3();
  private tmpVectorB = new THREE.Vector3();
  private wasRunningBeforeContextLoss = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(CONFIG.FOV, 1, 0.1, 300);
    this.camera.position.z = CONFIG.CAMERA_Z;

    this.createCloud();
    this.createLinks();
    this.createBonds();
    this.attachContextLossHandling();
    this.resize(window.innerWidth, window.innerHeight);
  }

  /** Applies theme colors; components are treated as sRGB (matching the CSS vars). */
  setThemeColors(line: ThemeColorInput, node: ThemeColorInput): void {
    this.lineColor.setRGB(line.r / 255, line.g / 255, line.b / 255, THREE.SRGBColorSpace);
    this.lineAlpha = line.a;
    this.nodeAlpha = node.a;
    this.pointsMaterial.color.setRGB(node.r / 255, node.g / 255, node.b / 255, THREE.SRGBColorSpace);
    this.pointsMaterial.opacity = node.a;
  }

  /** Receives a pointer/touch position in CSS pixels and projects it to the z = 0 plane. */
  setPointer(clientX: number, clientY: number): void {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    this.pointerNdc.set(ndcX, ndcY);
    this.parallaxTarget.set(ndcX * CONFIG.PARALLAX_STRENGTH, ndcY * CONFIG.PARALLAX_STRENGTH);

    // Unproject the NDC point onto the z = 0 plane.
    this.tmpVector.set(ndcX, ndcY, 0.5).unproject(this.camera);
    const direction = this.tmpVector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / direction.z;
    if (distance > 0) {
      this.pointerTarget
        .copy(this.camera.position)
        .addScaledVector(direction, distance);
    }
    this.pointerActive = true;
  }

  clearPointer(): void {
    this.pointerActive = false;
    this.parallaxTarget.set(0, 0);
  }

  /**
   * One-shot hit test for grab & pull (event-driven, runs once per
   * pointerdown; O(n) + O(live segments)). Projects every live particle to
   * CSS pixels and returns the nearest node within GRAB_PICK_RADIUS, or —
   * when the pointer sits near a connecting line — the nearest endpoint of
   * that line (the "line snaps a node to the hand" behavior). Returns -1
   * when nothing is in range.
   */
  pickAt(clientX: number, clientY: number): number {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const halfW = width / 2;
    const halfH = height / 2;

    this.camera.updateMatrixWorld();
    const positions = this.renderPositions;
    const basePositions = this.basePositions;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.tmpVector.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      // View-space guard: particles behind the camera project to mirrored
      // NDC, so mark them invalid (NaN never wins the nearest test). Offsets
      // are tiny next to the camera distance, so the guard from the visual
      // position also covers the lattice position.
      this.tmpVectorB.copy(this.tmpVector).applyMatrix4(this.camera.matrixWorldInverse);
      if (this.tmpVectorB.z > -0.1) {
        this.screenPositions[i * 2] = NaN;
        this.screenPositions[i * 2 + 1] = NaN;
        this.screenBasePositions[i * 2] = NaN;
        this.screenBasePositions[i * 2 + 1] = NaN;
        continue;
      }
      this.tmpVector.project(this.camera);
      this.screenPositions[i * 2] = (this.tmpVector.x + 1) * halfW;
      this.screenPositions[i * 2 + 1] = (1 - this.tmpVector.y) * halfH;
      // Second projection of the lattice position: grabbing is instant even
      // when the node is visually displaced by the repulsion field or still
      // springing home after a release.
      this.tmpVector.set(basePositions[i3], basePositions[i3 + 1], basePositions[i3 + 2]);
      this.tmpVector.project(this.camera);
      this.screenBasePositions[i * 2] = (this.tmpVector.x + 1) * halfW;
      this.screenBasePositions[i * 2 + 1] = (1 - this.tmpVector.y) * halfH;
    }

    let best = -1;
    let bestDistSq = CONFIG.GRAB_PICK_RADIUS * CONFIG.GRAB_PICK_RADIUS;
    for (let i = 0; i < this.count; i++) {
      const dxr = this.screenPositions[i * 2] - pointerX;
      const dyr = this.screenPositions[i * 2 + 1] - pointerY;
      const dxb = this.screenBasePositions[i * 2] - pointerX;
      const dyb = this.screenBasePositions[i * 2 + 1] - pointerY;
      const distSq = Math.min(dxr * dxr + dyr * dyr, dxb * dxb + dyb * dyb);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = i;
      }
    }
    if (best >= 0) return best;

    // Line pass: 2D point-to-segment distance against the live segments; the
    // candidate is the endpoint closer to the pointer.
    let segmentBest = -1;
    let segmentDistSq = CONFIG.GRAB_LINE_PICK_RADIUS * CONFIG.GRAB_LINE_PICK_RADIUS;
    for (let s = 0; s < this.linkCount; s++) {
      const a = this.linkIndices[s * 2];
      const b = this.linkIndices[s * 2 + 1];
      const ax = this.screenPositions[a * 2];
      const ay = this.screenPositions[a * 2 + 1];
      const bx = this.screenPositions[b * 2];
      const by = this.screenPositions[b * 2 + 1];
      const abx = bx - ax;
      const aby = by - ay;
      const lengthSq = abx * abx + aby * aby;
      let t = 0;
      if (lengthSq > 1e-6) {
        t = ((pointerX - ax) * abx + (pointerY - ay) * aby) / lengthSq;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
      }
      const dx = ax + abx * t - pointerX;
      const dy = ay + aby * t - pointerY;
      const distSq = dx * dx + dy * dy;
      if (distSq < segmentDistSq) {
        segmentDistSq = distSq;
        // Closest endpoint of the closest segment.
        const daSq = (ax - pointerX) * (ax - pointerX) + (ay - pointerY) * (ay - pointerY);
        const dbSq = (bx - pointerX) * (bx - pointerX) + (by - pointerY) * (by - pointerY);
        segmentBest = daSq <= dbSq ? a : b;
      }
    }
    return segmentBest;
  }

  /** Starts holding a node; the drag plane is frozen at its current depth. */
  beginGrab(index: number): void {
    if (index < 0 || index >= this.count) return;
    this.grabIndex = index;
    const i3 = index * 3;
    this.grabZ = this.renderPositions[i3 + 2];
    this.grabTarget.set(this.renderPositions[i3], this.renderPositions[i3 + 1], this.grabZ);
  }

  /** Moves the grab target to the pointer ray intersected with the z = grabZ plane. */
  moveGrab(clientX: number, clientY: number): void {
    if (this.grabIndex < 0) return;
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const ndcX = (clientX / width) * 2 - 1;
    const ndcY = -(clientY / height) * 2 + 1;

    this.camera.updateMatrixWorld();
    // Pointer ray; keeping z fixed at the grabbed node's depth is what makes
    // background layers draggable "in their own plane".
    this.tmpVector.set(ndcX, ndcY, 0.5).unproject(this.camera);
    this.tmpVector.sub(this.camera.position).normalize();
    const directionZ = this.tmpVector.z;
    if (Math.abs(directionZ) < 1e-6) return;
    const t = (this.grabZ - this.camera.position.z) / directionZ;
    if (t <= 0) return;
    this.grabTarget.copy(this.camera.position).addScaledVector(this.tmpVector, t);
  }

  /**
   * Releases the held node. If the drop point sits within BOND_SNAP_DISTANCE
   * of another node, the two combine: the dropped node's home relocates to
   * the drop point (it stays there) and a persistent bond line is drawn.
   */
  endGrab(): void {
    const index = this.grabIndex;
    this.grabIndex = -1;
    if (index < 0 || index >= this.count) return;
    this.tryFormBond(index);
  }

  /**
   * Bond formation on release (event-driven, O(n)): find the nearest other
   * node within snap distance of the drop point, relocate the dropped node's
   * home there (clamped into the volume, offset zeroed so it rests exactly
   * at the drop point — one home in ~190 is a negligible density shift), and
   * register the pair. Duplicate pairs are skipped; the list is a hard FIFO
   * capped at BOND_MAX_COUNT (oldest bond gives way when full).
   */
  private tryFormBond(dropped: number): void {
    const positions = this.renderPositions;
    const d3 = dropped * 3;
    const dropX = positions[d3];
    const dropY = positions[d3 + 1];
    const dropZ = positions[d3 + 2];

    let neighbor = -1;
    let bestDistSq = CONFIG.BOND_SNAP_DISTANCE * CONFIG.BOND_SNAP_DISTANCE;
    for (let i = 0; i < this.count; i++) {
      if (i === dropped) continue;
      const i3 = i * 3;
      const dx = positions[i3] - dropX;
      const dy = positions[i3 + 1] - dropY;
      const dz = positions[i3 + 2] - dropZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        neighbor = i;
      }
    }
    if (neighbor < 0) return;

    const { halfW, halfH, halfZ } = this.bounds;
    this.basePositions[d3] = clamp(dropX, halfW);
    this.basePositions[d3 + 1] = clamp(dropY, halfH);
    this.basePositions[d3 + 2] = clamp(dropZ, halfZ);
    this.offsets[d3] = 0;
    this.offsets[d3 + 1] = 0;
    this.offsets[d3 + 2] = 0;
    this.renderPositions[d3] = this.basePositions[d3];
    this.renderPositions[d3 + 1] = this.basePositions[d3 + 1];
    this.renderPositions[d3 + 2] = this.basePositions[d3 + 2];

    for (let k = 0; k < this.bondCount; k++) {
      const a = this.bondPairs[k * 2];
      const b = this.bondPairs[k * 2 + 1];
      if ((a === dropped && b === neighbor) || (a === neighbor && b === dropped)) return;
    }

    if (this.bondCount >= CONFIG.BOND_MAX_COUNT) {
      this.bondPairs.copyWithin(0, 2, this.bondCount * 2);
      this.bondCount--;
    }
    this.bondPairs[this.bondCount * 2] = dropped;
    this.bondPairs[this.bondCount * 2 + 1] = neighbor;
    this.bondCount++;
  }

  /** Order-preserving removal (rare event; the list holds at most 64 pairs). */
  private removeBond(k: number): void {
    this.bondPairs.copyWithin(k * 2, (k + 1) * 2, this.bondCount * 2);
    this.bondCount--;
  }

  /**
   * Per-frame bond pass (≤64 pairs, trivial): rewrite endpoint positions from
   * the live render positions, and dissolve bonds whose endpoints drifted
   * beyond BOND_BREAK_DISTANCE. A break only removes the line — homes never
   * spring back, so relocated nodes keep their new place.
   */
  private updateBonds(): void {
    const positions = this.renderPositions;
    const alpha = Math.min(1, this.lineAlpha * CONFIG.BOND_ALPHA_MULTIPLIER);
    const { r, g, b } = this.lineColor;
    const breakDistSq = CONFIG.BOND_BREAK_DISTANCE * CONFIG.BOND_BREAK_DISTANCE;
    let k = 0;
    while (k < this.bondCount) {
      const a3 = this.bondPairs[k * 2] * 3;
      const b3 = this.bondPairs[k * 2 + 1] * 3;
      const dx = positions[a3] - positions[b3];
      const dy = positions[a3 + 1] - positions[b3 + 1];
      const dz = positions[a3 + 2] - positions[b3 + 2];
      if (dx * dx + dy * dy + dz * dz > breakDistSq) {
        this.removeBond(k);
        continue;
      }
      const p = k * 6;
      this.bondPositions[p] = positions[a3];
      this.bondPositions[p + 1] = positions[a3 + 1];
      this.bondPositions[p + 2] = positions[a3 + 2];
      this.bondPositions[p + 3] = positions[b3];
      this.bondPositions[p + 4] = positions[b3 + 1];
      this.bondPositions[p + 5] = positions[b3 + 2];
      const c = k * 8;
      this.bondColors[c] = r;
      this.bondColors[c + 1] = g;
      this.bondColors[c + 2] = b;
      this.bondColors[c + 3] = alpha;
      this.bondColors[c + 4] = r;
      this.bondColors[c + 5] = g;
      this.bondColors[c + 6] = b;
      this.bondColors[c + 7] = alpha;
      k++;
    }
    this.bondPositionAttribute.needsUpdate = true;
    this.bondColorAttribute.needsUpdate = true;
    this.bonds.geometry.setDrawRange(0, this.bondCount * 2);
  }

  /** Recomputes projection and volume on viewport changes; reseeds when the target count changes. */
  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const previous = { ...this.bounds };
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(CONFIG.FOV / 2)) * CONFIG.CAMERA_Z;
    this.bounds = {
      halfH: (visibleHeight / 2) * CONFIG.VOLUME_MARGIN,
      halfW: ((visibleHeight * this.camera.aspect) / 2) * CONFIG.VOLUME_MARGIN,
      halfZ: ((visibleHeight * CONFIG.VOLUME_DEPTH_RATIO) / 2),
    };

    const desiredCount = width < CONFIG.MOBILE_BREAKPOINT
      ? CONFIG.PARTICLE_COUNT_MOBILE
      : CONFIG.PARTICLE_COUNT_DESKTOP;

    if (desiredCount !== this.count) {
      this.seed(desiredCount);
    } else {
      this.rescale(previous);
    }
  }

  start(): void {
    if (this.rafId !== null) return;
    this.clock.getDelta(); // discard the pause gap
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Renders a single still frame (drift and pointer disabled) for reduced motion. */
  renderStaticFrame(): void {
    this.update(0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.stop();
    this.detachContextLossHandling();
    this.points.geometry.dispose();
    this.links.geometry.dispose();
    this.bonds.geometry.dispose();
    this.pointsMaterial.dispose();
    this.linksMaterial.dispose();
    this.bondMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /**
   * Keeps the canvas usable across WebGL context loss: preventDefault lets
   * the context be restored, three.js re-uploads its resources on restore,
   * and the loop restarts only if it was running before the loss (otherwise
   * a single static frame is rendered, matching the reduced-motion contract).
   */
  private attachContextLossHandling(): void {
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private detachContextLossHandling(): void {
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.wasRunningBeforeContextLoss = this.rafId !== null;
    this.stop();
  };

  private handleContextRestored = (): void => {
    if (this.wasRunningBeforeContextLoss) {
      this.start();
    } else {
      this.renderStaticFrame();
    }
  };

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), CONFIG.MAX_DELTA);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    const idleTarget = this.pointerActive ? 0 : 1;
    this.idleWeight += (idleTarget - this.idleWeight) * (1 - Math.exp(-CONFIG.IDLE_BLEND_RATE * dt));
    this.smoothPointer(dt);
    this.updateParticles(dt);
    this.rebuildLinks();
    this.updateBonds();
    this.positionAttribute.needsUpdate = true;
    this.nodeColorAttribute.needsUpdate = true;
    this.linkPositionAttribute.needsUpdate = true;
    this.linkColorAttribute.needsUpdate = true;
    this.links.geometry.setDrawRange(0, this.linkCount * 2);
  }

  private smoothPointer(dt: number): void {
    const pointerFactor = 1 - Math.exp(-CONFIG.POINTER_DAMPING * dt);
    if (this.pointerActive) {
      this.pointerSmoothed.lerp(this.pointerTarget, pointerFactor);
    }
    const parallaxFactor = 1 - Math.exp(-CONFIG.POINTER_DAMPING * dt);
    this.camera.position.x += (this.parallaxTarget.x - this.camera.position.x) * parallaxFactor;
    this.camera.position.y += (this.parallaxTarget.y - this.camera.position.y) * parallaxFactor;

    // Autonomous Lissajous drift so depth reads without pointer input.
    // Offsets derive from the integrated clock (deterministic per frame), so
    // a zero delta keeps the camera frozen for the reduced-motion frame.
    const w = this.idleWeight;
    const omega = (Math.PI * 2) / CONFIG.IDLE_DRIFT_PERIOD;
    const t = this.elapsed;
    const amplitude = CONFIG.IDLE_DRIFT_AMPLITUDE;
    if (w > 0.001) {
      this.camera.position.x += amplitude * w * Math.sin(omega * t);
      this.camera.position.y += amplitude * w * 0.75 * Math.sin(omega * 1.618 * t + 1.3);
    }
    this.camera.position.z = CONFIG.CAMERA_Z
      + amplitude * w * 0.5 * Math.sin(omega * 0.618 * t + 0.7);
    this.camera.lookAt(0, 0, 0);
  }

  private updateParticles(dt: number): void {
    const damp = Math.exp(-CONFIG.OFFSET_DAMPING * dt);
    const { halfW, halfH, halfZ } = this.bounds;
    const repelRadiusSq = CONFIG.REPEL_RADIUS * CONFIG.REPEL_RADIUS;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Slow individual drift with wrap-around at the volume edges.
      let bx = this.basePositions[i3] + this.drifts[i3] * dt;
      let by = this.basePositions[i3 + 1] + this.drifts[i3 + 1] * dt;
      let bz = this.basePositions[i3 + 2] + this.drifts[i3 + 2] * dt;
      if (bx > halfW) bx -= halfW * 2; else if (bx < -halfW) bx += halfW * 2;
      if (by > halfH) by -= halfH * 2; else if (by < -halfH) by += halfH * 2;
      if (bz > halfZ) bz -= halfZ * 2; else if (bz < -halfZ) bz += halfZ * 2;
      this.basePositions[i3] = bx;
      this.basePositions[i3 + 1] = by;
      this.basePositions[i3 + 2] = bz;

      // Gentle repulsion from the smoothed pointer, clamped, springing back.
      // The held node is exempt: the grab spring owns its offset.
      if (dt > 0 && this.pointerActive && i !== this.grabIndex) {
        const dx = bx - this.pointerSmoothed.x;
        const dy = by - this.pointerSmoothed.y;
        const dz = bz - this.pointerSmoothed.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < repelRadiusSq && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / CONFIG.REPEL_RADIUS;
          const push = (falloff * falloff) * CONFIG.REPEL_STRENGTH * dt / dist;
          this.offsets[i3] = clamp(this.offsets[i3] + dx * push, CONFIG.REPEL_MAX_OFFSET);
          this.offsets[i3 + 1] = clamp(this.offsets[i3 + 1] + dy * push, CONFIG.REPEL_MAX_OFFSET);
          this.offsets[i3 + 2] = clamp(this.offsets[i3 + 2] + dz * push, CONFIG.REPEL_MAX_OFFSET);
        }
      }

      if (i === this.grabIndex) {
        // Held: spring the offset toward (grabTarget - base) so the drag rides
        // on the offset system — basePositions stay untouched and release
        // decays back through the regular spring path below.
        const stiffness = 1 - Math.exp(-CONFIG.GRAB_STIFFNESS * dt);
        this.offsets[i3] += (this.grabTarget.x - bx - this.offsets[i3]) * stiffness;
        this.offsets[i3 + 1] += (this.grabTarget.y - by - this.offsets[i3 + 1]) * stiffness;
        this.offsets[i3 + 2] += (this.grabTarget.z - bz - this.offsets[i3 + 2]) * stiffness;
      } else {
        this.offsets[i3] *= damp;
        this.offsets[i3 + 1] *= damp;
        this.offsets[i3 + 2] *= damp;
      }

      this.renderPositions[i3] = this.basePositions[i3] + this.offsets[i3];
      this.renderPositions[i3 + 1] = this.basePositions[i3 + 1] + this.offsets[i3 + 1];
      this.renderPositions[i3 + 2] = this.basePositions[i3 + 2] + this.offsets[i3 + 2];

      // Fog cue on top of size attenuation: alpha falls toward the floor at
      // the far plane so distant particles dim instead of just shrinking.
      // The grabbed node lights up at full alpha as a "caught" affordance.
      const i4 = i * 4;
      const depth = (this.renderPositions[i3 + 2] + halfZ) / (halfZ * 2);
      const nodeFade = CONFIG.NODE_DEPTH_FLOOR
        + (1 - CONFIG.NODE_DEPTH_FLOOR) * Math.min(Math.max(depth, 0), 1);
      this.nodeColors[i4 + 3] = i === this.grabIndex ? 1 : nodeFade;
    }
  }

  /**
   * Recomputes connections with a capped O(n^2) pass (~18k pairs at 190
   * particles, squared-distance early-out). Line alpha falls off with pair
   * distance and with depth so far links read as background.
   */
  private rebuildLinks(): void {
    const positions = this.renderPositions;
    const linkDist = CONFIG.LINK_DISTANCE;
    const linkDistSq = linkDist * linkDist;
    const depthRange = this.bounds.halfZ * 2;
    let segment = 0;

    for (let i = 0; i < this.count && segment < this.linkCapacity; i++) {
      const i3 = i * 3;
      const xi = positions[i3];
      const yi = positions[i3 + 1];
      const zi = positions[i3 + 2];
      for (let j = i + 1; j < this.count; j++) {
        const j3 = j * 3;
        const dx = xi - positions[j3];
        const dy = yi - positions[j3 + 1];
        const dz = zi - positions[j3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= linkDistSq) continue;

        const dist = Math.sqrt(distSq);
        const distanceFade = 1 - dist / linkDist;
        const depthFade = CONFIG.LINK_DEPTH_FLOOR
          + (1 - CONFIG.LINK_DEPTH_FLOOR) * ((zi + positions[j3 + 2] + this.bounds.halfZ) / depthRange);
        const alpha = this.lineAlpha * distanceFade * depthFade;
        if (alpha < 0.004) continue;

        this.writeSegment(segment, xi, yi, zi, positions[j3], positions[j3 + 1], positions[j3 + 2], alpha);
        // Endpoint indices let the grab pick resolve a line to its nodes.
        this.linkIndices[segment * 2] = i;
        this.linkIndices[segment * 2 + 1] = j;
        if (++segment >= this.linkCapacity) break;
      }
    }
    this.linkCount = segment;
  }

  private writeSegment(
    segment: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    alpha: number,
  ): void {
    const p = segment * 6;
    const c = segment * 8;
    const { r, g, b } = this.lineColor;
    this.linkPositions[p] = x1;
    this.linkPositions[p + 1] = y1;
    this.linkPositions[p + 2] = z1;
    this.linkPositions[p + 3] = x2;
    this.linkPositions[p + 4] = y2;
    this.linkPositions[p + 5] = z2;
    // Vertex colors are RGBA (itemSize 4): three enables USE_COLOR_ALPHA for them.
    this.linkColors[c] = r;
    this.linkColors[c + 1] = g;
    this.linkColors[c + 2] = b;
    this.linkColors[c + 3] = alpha;
    this.linkColors[c + 4] = r;
    this.linkColors[c + 5] = g;
    this.linkColors[c + 6] = b;
    this.linkColors[c + 7] = alpha;
  }

  /** Allocates particle buffers for a count (construction and reseeds only). */
  private seed(count: number): void {
    this.count = count;
    this.basePositions = new Float32Array(count * 3);
    this.offsets = new Float32Array(count * 3);
    this.drifts = new Float32Array(count * 3);
    this.renderPositions = new Float32Array(count * 3);
    this.nodeColors = new Float32Array(count * 4);
    this.screenPositions = new Float32Array(count * 2);
    this.screenBasePositions = new Float32Array(count * 2);
    // Reseeding invalidates particle indices: drop any active grab and all
    // bonds (base positions regenerate).
    this.grabIndex = -1;
    this.bondCount = 0;
    this.scatterParticles();
    this.points.geometry.dispose();
    this.points.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.renderPositions, 3);
    this.points.geometry.setAttribute('position', this.positionAttribute);
    // White vertex RGB keeps the material tint authoritative; the per-particle
    // alpha channel is rewritten every frame in updateParticles.
    for (let i = 0; i < count; i++) {
      const i4 = i * 4;
      this.nodeColors[i4] = 1;
      this.nodeColors[i4 + 1] = 1;
      this.nodeColors[i4 + 2] = 1;
      this.nodeColors[i4 + 3] = 1;
    }
    this.nodeColorAttribute = new THREE.BufferAttribute(this.nodeColors, 4);
    this.points.geometry.setAttribute('color', this.nodeColorAttribute);
  }

  /** Distributes particles uniformly in the volume with random drift vectors. */
  private scatterParticles(): void {
    const { halfW, halfH, halfZ } = this.bounds;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.basePositions[i3] = randomIn(-halfW, halfW);
      this.basePositions[i3 + 1] = randomIn(-halfH, halfH);
      this.basePositions[i3 + 2] = randomIn(-halfZ, halfZ);
      this.renderPositions[i3] = this.basePositions[i3];
      this.renderPositions[i3 + 1] = this.basePositions[i3 + 1];
      this.renderPositions[i3 + 2] = this.basePositions[i3 + 2];
      const speed = CONFIG.DRIFT_SPEED * (0.5 + Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this.drifts[i3] = speed * Math.sin(phi) * Math.cos(theta);
      this.drifts[i3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
      this.drifts[i3 + 2] = speed * Math.cos(phi);
    }
  }

  /** Keeps particle density proportional when the volume changes without a reseed. */
  private rescale(previous: VolumeBounds): void {
    const scaleX = this.bounds.halfW / previous.halfW;
    const scaleY = this.bounds.halfH / previous.halfH;
    const scaleZ = this.bounds.halfZ / previous.halfZ;
    for (let i = 0; i < this.count * 3; i += 3) {
      this.basePositions[i] *= scaleX;
      this.basePositions[i + 1] *= scaleY;
      this.basePositions[i + 2] *= scaleZ;
      this.renderPositions[i] = this.basePositions[i] + this.offsets[i];
      this.renderPositions[i + 1] = this.basePositions[i + 1] + this.offsets[i + 1];
      this.renderPositions[i + 2] = this.basePositions[i + 2] + this.offsets[i + 2];
    }
  }

  private createCloud(): void {
    this.pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: CONFIG.PARTICLE_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: this.nodeAlpha,
      depthWrite: false,
      // 4-component vertex colors enable USE_COLOR_ALPHA, so each particle
      // carries its own depth-fade alpha in the buffer.
      vertexColors: true,
    });
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.pointsMaterial);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private createLinks(): void {
    const geometry = new THREE.BufferGeometry();
    this.linkPositionAttribute = new THREE.BufferAttribute(this.linkPositions, 3);
    this.linkColorAttribute = new THREE.BufferAttribute(this.linkColors, 4);
    geometry.setAttribute('position', this.linkPositionAttribute);
    geometry.setAttribute('color', this.linkColorAttribute);
    geometry.setDrawRange(0, 0);
    this.linksMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    this.links = new THREE.LineSegments(geometry, this.linksMaterial);
    this.links.frustumCulled = false;
    this.scene.add(this.links);
  }

  /** Dedicated mesh for persistent bonds: same theme-driven vertex-color
   *  pipeline as the links, at BOND_ALPHA_MULTIPLIER x the line alpha so a
   *  bond reads as special next to the transient proximity lines. */
  private createBonds(): void {
    const geometry = new THREE.BufferGeometry();
    this.bondPositionAttribute = new THREE.BufferAttribute(this.bondPositions, 3);
    this.bondColorAttribute = new THREE.BufferAttribute(this.bondColors, 4);
    geometry.setAttribute('position', this.bondPositionAttribute);
    geometry.setAttribute('color', this.bondColorAttribute);
    geometry.setDrawRange(0, 0);
    this.bondMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    this.bonds = new THREE.LineSegments(geometry, this.bondMaterial);
    this.bonds.frustumCulled = false;
    this.scene.add(this.bonds);
  }
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, limit: number): number {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}
