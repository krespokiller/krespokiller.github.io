# InteractiveBackground - 3D Particle Network

## Overview

Fullscreen decorative background rendered with three.js: a cloud of particles
drifting through a real 3D volume, connected by lines that recompute live.
The pointer drives a damped camera parallax and a gentle repulsion field, so
the network keeps the reactive feel of the old Canvas 2D version with real depth.

## How It Works

- **Particles** (`150` desktop / `70` mobile) are spread uniformly in a volume
  sized from the camera frustum, each with its own slow random drift vector
  and wrap-around at the volume edges.
- **Links** are recomputed every frame with a capped O(n^2) pass (squared
  distance early-out, hard cap `LINK_MAX_SEGMENTS`). Line alpha falls off with
  pair distance and with depth, so far links read as background. Segments are
  written into preallocated `Float32Array` buffers (positions + RGBA vertex
  colors) — no per-frame allocations; only `needsUpdate` flags flip.
- **Pointer model**: the pointer is unprojected onto the `z = 0` plane and
  smoothed with exponential damping. Particles inside `REPEL_RADIUS` get a
  clamped repulsion offset that springs back to rest; the camera offsets
  toward the pointer (`PARALLAX_STRENGTH`) and eases back when it leaves.
- **Theme**: colors come from the `--line-color` / `--node-color` CSS vars.
  A `MutationObserver` on the root `data-theme` attribute re-reads them, so
  theme switches update particles and links live.

## Configuration

All tunables live in `interactiveBackground.config.ts` next to the component:

| Knob | Meaning |
|------|---------|
| `PARTICLE_COUNT_DESKTOP` / `_MOBILE` | Particle count per breakpoint |
| `LINK_DISTANCE` | 3D distance threshold for connections |
| `LINK_MAX_SEGMENTS` | Pooled link buffer capacity |
| `DRIFT_SPEED` | Base per-particle drift speed |
| `REPEL_RADIUS` / `REPEL_STRENGTH` / `REPEL_MAX_OFFSET` | Repulsion field |
| `POINTER_DAMPING` / `OFFSET_DAMPING` | Smoothing rates (frame-rate independent) |
| `PARALLAX_STRENGTH` | Camera offset at the screen edge |
| `MAX_DPR` | Device pixel ratio cap for rendering |

## Performance & Accessibility

- Device pixel ratio capped at 2; DPR-scaled renderer for Retina displays.
- Pointer state lives in refs — no React re-renders on pointer move.
- The rAF loop pauses when `document.hidden`; unmount disposes geometries,
  materials, renderer, listeners and observers.
- `prefers-reduced-motion: reduce` renders a single static frame (particles +
  links, no loop, no pointer reaction); the media query is observed live, so
  the loop starts/stops if the setting changes.
- Canvas is `aria-hidden="true"`, `role="presentation"`, `pointer-events-none`.

Note: the old 800ms interaction fade was dropped on purpose — the scene is
always visible and pointer effects ease back to rest via damping.

## Usage

Mounted once in `Home.tsx`; no props, content sits at `z-20` above it.
