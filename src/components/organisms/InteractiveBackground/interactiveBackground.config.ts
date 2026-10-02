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
  PARTICLE_COUNT_DESKTOP: 150,
  PARTICLE_COUNT_MOBILE: 70,
  MOBILE_BREAKPOINT: 768,
  PARTICLE_SIZE: 0.55,
  VOLUME_MARGIN: 1.15,
  VOLUME_DEPTH_RATIO: 0.5,

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
  PARALLAX_STRENGTH: 2.5,

  // Link depth fade: links near the far plane render at this fraction of alpha
  LINK_DEPTH_FLOOR: 0.55,
} as const;
