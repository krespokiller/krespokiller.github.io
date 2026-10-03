# InteractiveBackground - 3D Particle Network

## Overview

Fullscreen decorative background rendered with three.js: a cloud of particles
drifting through a real 3D volume, connected by lines that recompute live.
The pointer drives a damped camera parallax and a gentle repulsion field, so
the network keeps the reactive feel of the old Canvas 2D version with real depth.

## How It Works

- **Particles** (`190` desktop / `90` mobile) are spread uniformly in a volume
  sized from the camera frustum (`VOLUME_DEPTH_RATIO` controls how deep the
  z axis is), each with its own slow random drift vector and wrap-around at
  the volume edges. A 4-component vertex color buffer gives every particle
  its own alpha: a fog falloff (`NODE_DEPTH_FLOOR`) dims far particles on top
  of the size attenuation, which already makes them smaller.
- **Links** are recomputed every frame with a capped O(n^2) pass (squared
  distance early-out, hard cap `LINK_MAX_SEGMENTS`). Line alpha falls off with
  pair distance and with depth (`LINK_DEPTH_FLOOR`), so far links read as
  background. Segments are written into preallocated `Float32Array` buffers
  (positions + RGBA vertex colors) — no per-frame allocations; only
  `needsUpdate` flags flip.
- **Pointer model**: the pointer is unprojected onto the `z = 0` plane and
  smoothed with exponential damping. Particles inside `REPEL_RADIUS` get a
  clamped repulsion offset that springs back to rest; the camera offsets
  toward the pointer (`PARALLAX_STRENGTH`) and eases back when it leaves.
- **Idle drift**: with no pointer activity the camera follows a slow
  Lissajous path (`IDLE_DRIFT_AMPLITUDE` / `IDLE_DRIFT_PERIOD`) plus a slight
  dolly, so the 3D reads even at rest. A weight eases the drift in and out
  (`IDLE_BLEND_RATE`) so it hands off smoothly to pointer parallax. The drift
  clock is integrated from rAF deltas, never wall time — a zero delta (the
  reduced-motion static frame) cannot move the camera, and pausing on a
  hidden tab never causes a jump on resume.
- **Grab & pull**: press near a node (or on a line — the line's nearest
  endpoint snaps to the hand) and drag to pull it; connected lines stretch
  with it; release and it springs back. Nodes are grabbable at any depth.
- **Theme**: single theme — dark is the brand. Colors come from the
  `--line-color` / `--node-color` CSS vars (amber signature on near-black),
  read once at init; with no theme switching there is no observer.

## Grab & Pull

Press-and-drag on the background network:

- **Pick** (once per pointerdown, O(n) + O(live segments)): all particles are
  projected to CSS pixels at BOTH their visual and lattice (base) positions;
  the nearest node within `GRAB_PICK_RADIUS` of either wins. Measuring both
  spots is what makes re-grabbing instant: the repulsion field keeps nearby
  nodes displaced away from a resting cursor and a released node is still
  springing home, so aiming at only the visual position used to miss. If no
  node is close, the live line segments are tested with 2D point-to-segment
  distance (`GRAB_LINE_PICK_RADIUS`) and that segment's nearest endpoint node
  is grabbed — pressing a line pulls a node to you.
- **Depth model**: the drag target is the intersection of the pointer ray
  with the plane `z = node z at pick time`. Depth is preserved, so deep
  background layers are dragged within their own plane — that is what makes
  far nodes grabbable despite the parallax. The held position is a damped
  spring (`GRAB_STIFFNESS`) riding on the per-particle offset system, so
  `basePositions` are never touched and release springs back through the
  normal decay. Idle drift and pointer parallax keep running underneath.
- **Affordance**: the grabbed node's vertex alpha is raised to 1.0 (the
  per-particle color buffer) and `body` gets `cursor: grabbing` while the
  drag is active.
- **Layer model ("playground total")**: the canvas owns the click everywhere.
  Page content roots (`<main>` in Home, the Footer organism) carry the
  `.layer-content` class: `pointer-events: none` makes them transparent to
  the pointer, and `.layer-content a, .layer-content button,
  .layer-content [role="button"]` re-enable links and buttons inside them
  (descendants inherit the re-enabled value). The Navbar is fully interactive
  chrome and does not use the class. Text selection is intentionally
  disabled by this owner-of-click tradeoff (user decision, 2026-10-03);
  keyboard navigation is unaffected — `pointer-events` does not apply to
  focus, Tab order or `:focus-visible`.
- **Cursor**: the page body idles at `cursor: grab` (links and buttons keep
  `pointer`); the engine sets `cursor: grabbing` on `body` while a node is
  held and restores the stylesheet value on release.
- **Guards**: pointerdown is ignored when the target is (or is inside) an
  interactive element (`a`, `button`, `input`, `textarea`, `select`,
  `[role="button"]`, `[contenteditable]`). This is defense-in-depth — with
  the pointer-transparent layer those targets normally never receive the
  event — but a grab must never win over a control. Every other pixel grabs.
- **Release**: `pointerup`, `pointercancel`, window `blur`, tab hidden, a
  second finger landing, or reduced-motion toggling all release the node.
  Pointer capture on the origin element keeps the release reliable outside
  the window.
- **Touch gestures**: a non-passive `touchstart` listener arbitrates each
  touch. `pointerdown` fires before `touchstart`, so when a touch grabbed a
  node the listener calls `preventDefault()` — cancelling the browser's
  scroll claim for that gesture, so no `pointercancel` interrupts the drag
  and the pointer stream drives it. Touches that hit nothing (or a guarded
  interactive element) are never prevented: the page scrolls normally and
  link taps keep their clicks. Tradeoff: touching a node means dragging it,
  not scrolling from that touch; `pointercancel` (e.g. a browser-claimed
  pinch) remains the release safety net.
- **Reduced motion**: grab is disabled entirely — the static frame stays
  static regardless of user input.

## Bonds (combine nodes)

Dropping a grabbed node within `BOND_SNAP_DISTANCE` (3D, ~0.8 x
`LINK_DISTANCE`) of another node combines them:

- **Formation**: the nearest neighbor at the drop point wins. The dropped
  node's home relocates to the clamped drop point and its offset is zeroed,
  so it stays where you left it instead of springing home (it keeps the same
  slow ambient drift as every other particle — the scene stays alive; it
  just never flies back).
- **Rendering**: bonds are a dedicated `LineSegments` mesh (own preallocated
  buffers, FIFO-capped at `BOND_MAX_COUNT` pairs), drawn with the same
  theme-driven vertex-color pipeline as the links at
  `BOND_ALPHA_MULTIPLIER` x the line alpha, so a bond reads brighter than
  the transient proximity lines. Bond endpoints are rewritten every frame
  from the live render positions — bonds stretch and follow.
- **Breaking**: when both endpoints of a bond drift beyond
  `BOND_BREAK_DISTANCE` (~2.5 x `LINK_DISTANCE`), the bond dissolves — only
  the line disappears; homes never spring back on a break.
- **Lifecycle**: duplicate pairs are skipped; one node can hold several
  bonds. Bonds clear on breakpoint reseeds (base positions regenerate) and
  never form under reduced motion (no grab, no release).
- The grabbed-node alpha glow keeps working for relocated homes — it is a
  per-frame write keyed on the grab index, independent of where the home is.

## Configuration

All tunables live in `interactiveBackground.config.ts` next to the component:

| Knob | Meaning |
|------|---------|
| `PARTICLE_COUNT_DESKTOP` / `_MOBILE` | Particle count per breakpoint |
| `VOLUME_DEPTH_RATIO` | Depth of the particle volume vs. frustum height |
| `LINK_DISTANCE` | 3D distance threshold for connections |
| `LINK_MAX_SEGMENTS` | Pooled link buffer capacity |
| `LINK_DEPTH_FLOOR` / `NODE_DEPTH_FLOOR` | Alpha floor at the far plane for links / particles |
| `DRIFT_SPEED` | Base per-particle drift speed |
| `REPEL_RADIUS` / `REPEL_STRENGTH` / `REPEL_MAX_OFFSET` | Repulsion field |
| `POINTER_DAMPING` / `OFFSET_DAMPING` | Smoothing rates (frame-rate independent) |
| `PARALLAX_STRENGTH` | Camera offset at the screen edge |
| `IDLE_DRIFT_AMPLITUDE` / `_PERIOD` / `IDLE_BLEND_RATE` | Autonomous at-rest camera motion |
| `GRAB_PICK_RADIUS` / `GRAB_LINE_PICK_RADIUS` | Grab hit ranges in CSS px (node / line) |
| `GRAB_STIFFNESS` | Damped ease rate while holding a node |
| `BOND_SNAP_DISTANCE` / `BOND_BREAK_DISTANCE` | 3D combine radius on drop / drift distance that dissolves a bond |
| `BOND_MAX_COUNT` / `BOND_ALPHA_MULTIPLIER` | FIFO cap on persistent bonds / bond brightness vs. links |
| `MAX_DPR` | Device pixel ratio cap for rendering |

## Performance & Accessibility

- Device pixel ratio capped at 2; DPR-scaled renderer for Retina displays.
- Pointer state lives in refs — no React re-renders on pointer move.
- The rAF loop pauses when `document.hidden`; unmount disposes geometries,
  materials, renderer, listeners and observers.
- `prefers-reduced-motion: reduce` renders a single static frame (particles +
  links, no loop, no pointer reaction, idle drift off); the media query is
  observed live, so the loop starts/stops if the setting changes.
- Canvas is `aria-hidden="true"`, `role="presentation"`, `pointer-events-none`.

Note: the old 800ms interaction fade was dropped on purpose — the scene is
always visible and pointer effects ease back to rest via damping.

## Usage

Mounted once in `Home.tsx`; no props, content sits at `z-20` above it.
