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
  private linkPositionAttribute!: THREE.BufferAttribute;
  private linkColorAttribute!: THREE.BufferAttribute;
  private linkCount = 0;

  private bounds: VolumeBounds = { halfW: 1, halfH: 1, halfZ: 1 };
  private lineColor = new THREE.Color(1, 1, 1);
  private lineAlpha = 0.08;
  private nodeAlpha = 0.04;

  // Pointer state, smoothed with exponential damping
  private pointerTarget = new THREE.Vector3();
  private pointerSmoothed = new THREE.Vector3();
  private pointerNdc = new THREE.Vector2();
  private pointerActive = false;
  private parallaxTarget = new THREE.Vector2();

  private rafId: number | null = null;
  private tmpVector = new THREE.Vector3();

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
    this.points.geometry.dispose();
    this.links.geometry.dispose();
    this.pointsMaterial.dispose();
    this.linksMaterial.dispose();
    this.renderer.dispose();
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), CONFIG.MAX_DELTA);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    this.smoothPointer(dt);
    this.updateParticles(dt);
    this.rebuildLinks();
    this.positionAttribute.needsUpdate = true;
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
      if (dt > 0 && this.pointerActive) {
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
      this.offsets[i3] *= damp;
      this.offsets[i3 + 1] *= damp;
      this.offsets[i3 + 2] *= damp;

      this.renderPositions[i3] = this.basePositions[i3] + this.offsets[i3];
      this.renderPositions[i3 + 1] = this.basePositions[i3 + 1] + this.offsets[i3 + 1];
      this.renderPositions[i3 + 2] = this.basePositions[i3 + 2] + this.offsets[i3 + 2];
    }
  }

  /**
   * Recomputes connections with a capped O(n^2) pass (~11k pairs at 150
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
    this.scatterParticles();
    this.points.geometry.dispose();
    this.points.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.renderPositions, 3);
    this.points.geometry.setAttribute('position', this.positionAttribute);
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
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, limit: number): number {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}
