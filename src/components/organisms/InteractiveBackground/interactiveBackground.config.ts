/**
 * Tunables for the 3D particle-network background.
 * World units derive from the camera frustum at z = 0 (see ParticleNetwork.resize):
 * visible height = 2 * tan(FOV / 2) * CAMERA_Z, width = height * aspect.
 */
export const INTERACTIVE_BACKGROUND_CONFIG = {
  // Scene
  FOV: 60,
  CAMERA_Z: 60,
  MAX_DPR: 2,

  // Particles
  PARTICLE_COUNT_DESKTOP: 190,
  PARTICLE_COUNT_MOBILE: 90,
  MOBILE_BREAKPOINT: 768,
  PARTICLE_SIZE: 0.65,
  VOLUME_MARGIN: 1.15,
  VOLUME_DEPTH_RATIO: 0.85,

  // Links
  LINK_DISTANCE: 14,
  LINK_MAX_SEGMENTS: 900,

  // Motion
  DRIFT_SPEED: 0.6,
  MAX_DELTA: 0.05,

  // Pointer interaction
  REPEL_RADIUS: 12,
  REPEL_STRENGTH: 18,
  REPEL_MAX_OFFSET: 6,
  OFFSET_DAMPING: 4,
  POINTER_DAMPING: 8,
  PARALLAX_STRENGTH: 5,

  // Link depth fade: links near the far plane render at this fraction of alpha
  LINK_DEPTH_FLOOR: 0.35,

  // Node depth fade: per-particle alpha floor at the far plane (size already
  // attenuates with distance via sizeAttenuation)
  NODE_DEPTH_FLOOR: 0.35,

  // Idle camera drift: slow autonomous Lissajous motion so the 3D reads at
  // rest. Fades out while the pointer is active. Time is integrated from rAF
  // deltas (never wall clock), so reduced motion and tab pauses stay static.
  IDLE_DRIFT_AMPLITUDE: 2.4,
  IDLE_DRIFT_PERIOD: 40,
  IDLE_BLEND_RATE: 1.2,

  // Grab & pull: pick runs once per pointerdown (O(n) + O(segments)); the
  // drag itself is O(1) per frame. GRAB_STIFFNESS is the damped ease rate
  // toward the pointer while held (stiffer than OFFSET_DAMPING for a
  // "caught" feel); release falls back to the regular spring-back. The pick
  // measures against BOTH the visual and the lattice (base) position, so a
  // node displaced by the repulsion field or still springing is grabbable
  // instantly — including the node released a moment ago.
  GRAB_PICK_RADIUS: 36,
  GRAB_LINE_PICK_RADIUS: 24,
  GRAB_STIFFNESS: 12,

  // Node bonds: dropping a node within BOND_SNAP_DISTANCE of another relocates
  // its home to the drop point ("it stays there") and draws a permanent,
  // brighter bond line to the neighbor. A bond dissolves when its endpoints
  // drift beyond BOND_BREAK_DISTANCE (homes never spring back on a break).
  // Capacity is a hard FIFO cap; bonds clear on breakpoint reseeds.
  BOND_SNAP_DISTANCE: 11.2,
  BOND_BREAK_DISTANCE: 35,
  BOND_MAX_COUNT: 64,
  BOND_ALPHA_MULTIPLIER: 1.6,
} as const;
