# Feature: portfolio-3d-refresh

## Objective
Upgrade the portfolio: (1) replace the Canvas 2D node/Bézier background with a three.js 3D particle network, (2) make the site friendlier (navbar, about, richer experience cards, contact, UX polish), (3) fix the tech icon map and favicon.

## Problem
- Background is Canvas 2D (nodes + quadratic Bézier lines, gravitational repulsion). User wants a real 3D feel via three.js.
- Site is hero + experience + footer only: no navigation, no about, no contact, no showcase of work.
- iconMap gaps: tags `Vite`, `CoTURN`, `SDD` render as plain text; custom AWS SVG is reused for ECS/Aurora/Route 53; WebSocket SVG reused for WebRTC.
- Favicon 404: `index.html` references `/vite.svg` but `public/` does not exist.
- UX polish missing: chosen language not persisted (resets on reload), no `prefers-color-scheme` detection, no `prefers-reduced-motion` support anywhere.

## Why
User request (this session): 3D background with three.js, keep the automatic Pages deploy untouched, friendlier for visitors, fix weird-looking logos. User confirmed: 3D particle network style, all UX additions, all logo fixes.

## Scope (authorized)
- [x] **T1 — Icon map + favicon**: add Vite, CoTURN, SDD icons; give ECS, Aurora, Route 53, WebRTC their own correct icons (stop reusing AWS/WebSocket); replace broken favicon with a real one (no `public/` exists — create it). Keep iconMap single-source in `src/const/iconMap.tsx`.
  - Done (commits `750c571`, `fea508e`). SiVite + SiWebrtc from react-icons/si (verified against installed 5.7.0); custom SVGs: CoturnIcon, SddIcon, EcsIcon, AuroraIcon, Route53Icon. Favicon: public/favicon.svg (amber "D" monogram) + meta description. Bonus fix: removed dead vitest type reference in vite.config.mts that broke `tsc --noEmit` (pre-existing, commit `fea508e`).
  - Verification: writer reported tsc PASS + build PASS; parent spot-check `npx tsc --noEmit`: PASS.
  - Review assess (base main, committed-only): risk medium, 64 lines, review_due=false (`under_budget`) — pending in slice.
- [x] **T2 — 3D particle background**: add three.js; rewrite `InteractiveBackground` internals as a 3D particle network (depth, slow drift, mouse/touch parallax + repulsion feel), theme-aware via existing CSS vars, DPR-scaled, reduced params on mobile, hard pause + static fallback under `prefers-reduced-motion`. Keep the same mount point/props in `Home.tsx` and `aria-hidden` canvas behavior. Old 2D service/config: remove if fully replaced.
  - Done (commits `0316d66` + correction `f3a90bd`). three@0.186.1. Engine: `ParticleNetwork.ts` (THREE.Points + LineSegments, preallocated buffers, 900-segment cap, DPR≤2, hidden-tab pause, full dispose + forceContextLoss, webglcontextlost/restored handling). Reduced-motion: static frame + live repaint on theme change. Old services/config/models deleted; barrels, story, InteractiveBackground.md, README updated.
  - Verification: writer tsc+build PASS; independent verifier CONCERNS (3 fixed via `f3a90bd`, 1 deferred). Deferred: 792 kB single chunk (three.js inlined) — code-splitting trivially available (React.lazy on the organism); decision at T6/close.
- [ ] **T3 — Navbar**: fixed top nav with section anchors (About, Experience, Contact), active-section highlight on scroll, mobile-friendly (compact), respects theme + i18n.
- [x] **T4 — About + richer Experience cards**: new short About section (bio drafted from existing `experiences-*.json` data; user reviews); upgrade ExperienceSection entries into richer cards (achievements, stack icons via fixed iconMap, stylized visual treatment — NO confidential screenshots).
  - Done (commits `fd38fe7` + correction `31457ae`). AboutSection organism (#about, aria-labelledby, stack chips), ExperienceItem upgraded to semantic article cards with amber accents; highlights derived from existing text only. Independent fabrication audit: highlights clean; caught bio chronology misrepresentation (overlapping roles narrated as sequential) → fixed in `31457ae` ("two stints", "in parallel"). Note: tags `Algolia`/`Zoom API` also lack icons → folded into T6.
- [x] **T5 — Contact section**: final CTA section (email + GitHub/LinkedIn), i18n'd, accessible.
  - User decision: NO email exposed — GitHub/LinkedIn only.
  - Done (commit `20265e4`). ContactSection (#contact) with two CTA cards to GitHub/LinkedIn (URLs copied from Footer, rel=noopener), reveal-on-scroll, en/es. Batched independent verification: PASS.
- [x] **T3 — Navbar**: fixed top nav with section anchors (About, Experience, Contact), active-section highlight on scroll, mobile-friendly (compact), respects theme + i18n.
  - Done (commit `2983e35`). Header evolved into Navbar organism (old files deleted): brand + 3 anchor links + existing theme/lang toggles in ONE bar; useActiveSection (IntersectionObserver band, aria-current); scroll-mt-16 on sections; backdrop-blur hairline via CSS vars; mobile = text links (fits 375px, no hamburger). Batched verification: PASS.
- [x] **T6 — UX polish**: persist language choice (localStorage), detect system theme on first visit (keep manual override), respect `prefers-reduced-motion` globally (canvas + scroll reveals), any a11y gaps found.
  - Done (commit `afbea01` + a11y follow-up `f82d5b3`). Lang persisted in i18n init (synchronous, zero flash); system theme on first visit, stored choice wins (inline script + useTheme same rule); usePrefersReducedMotion shared hook → reveals instant + smooth-scroll branches to auto; Algolia (SiAlgolia) + Zoom API (SiZoom) icons; html[lang] syncs with language (screen readers). Batched verification: PASS (4 minor observations recorded below).
  - Deferred (documented, by decision): 792–803 kB single chunk with three.js inlined — code-splitting trivially available via React.lazy on InteractiveBackground; kept single-chunk so the background (the site's identity) doesn't pop in late. Minor verifier observations accepted as intended tradeoffs: first-visit system theme freezes into storage on mount; `import './i18n'` placed last in client.tsx (works via hoisting); useInView cleanup uses unobserve (equivalent for single element).

## Constraints
- Stack: Vite + React 18 + TS + Tailwind 4 + i18next (en/es) + react-icons; yarn 1.22. Do not swap the stack.
- Deploy: `.github/workflows/static.yml` builds `dist` and publishes to GitHub Pages on push to `main`. MUST keep working; do not touch workflow.
- Theme system: `data-theme` attribute + CSS variables — new background must read the same vars and react to theme changes.
- All new user-facing strings via i18n (en + es files).
- Neutral/professional English for code/comments/artifacts.
- No personal fake projects; company work is presented via experience cards.
- Review budget awareness: forecast below exceeds 400 lines → delivery strategy applies.

## Delivery
- Strategy locked: `single-pr` — one PR at the end (user decision). No chain strategy needed.

## Route per task
- T1: delegated direct (writer) — 2+ files.
- T2: delegated direct (writer) — dep + component + services rewrite.
- T3: delegated direct (writer).
- T4: delegated direct (writer, content mined from existing i18n data).
- T5: delegated direct (writer).
- T6: delegated direct (writer).

## Verification
- Per task: `npx tsc --noEmit` + `yarn build` must pass (observed, not assumed).
- Visual sanity via `yarn dev` where structural (background, navbar, sections).
- TDD: OFF — source: no test script or test runner exists in `package.json` (storybook only). Ordinary functional checks instead.

## Progress
- 2026-10-02: feature doc created; exploration done; product decisions collected. Delivery = single PR (user).
- 2026-10-02: T1 complete (icon map + favicon + dead vitest ref fix). Running count: 64 lines.
- 2026-10-02: T2 complete (three.js 3D particle network + scoped fixes). Running count: ~743 lines.
- 2026-10-02: Native review transport unavailable in this runtime (`immutable_review_transport_unsupported`, next_action stop, retry_safe false) for commits past T1. Per contract, failed assessment never lowers tier → high tier → independent verifier used per task (T2 own pass: CONCERNS resolved; T4 own pass: fabrication audit; T3+T5+T6 batched pass: OVERALL PASS). RDD stays on (user-owned switch); option to disable clone-locally surfaced at close.
- 2026-10-02: T4 complete (About + richer cards + bio chronology fix). Running count: ~1.9k lines changed on branch.
## Progress
- 2026-10-02: feature doc created; exploration done; product decisions collected. Delivery = single PR (user).
- 2026-10-02: T1–T6 + 4 corrections complete (see scope below). 10 commits on feature branch.
- 2026-10-02: USER REVIEW ROUND 1 → three follow-ups (user provided official CV as content source of truth, superseding the mine-from-existing-data constraint):
  - **T7 — Experience + About update from CV v2**: replace experience entries with CV's (Loopay **Tech Lead** Oct 2025–Present; Galgo Dec 2023–Sep 2025; Trebet Co-founder & Lead Engineer Sep 2024–Sep 2025 marked "parallel project"). CV omits Tribuu and the old Loopay FSD 2023–24 stint → removed per CV (flagged to user, reversible). About bio from CV RESUMEN (Tech Lead fintech, $1M+ daily, 5+ engineers, multi-tenant) + FULL grouped stack chips incl. AI & OCR (Languages/Backend/Frontend/Data/Cloud/Architecture/Testing/AI). New tags need iconMap coverage (Redis, FastAPI, React Native, Jest, pytest, SQLAlchemy, Gemini…).
  - **T8 — Light-mode background visibility**: `--line-color`/`--node-color` light-theme values render invisible; fix contrast.
  - **T9 — Stronger 3D feel**: deeper z spread, stronger parallax, depth fog/attenuation, config tuning. Keep 60fps + reduced-motion contract.
  - Visual sign-off for T8/T9 = user (dev server running at localhost:5173).
- 2026-10-03: USER REVIEW ROUND 2 (T8+T9 landed as `fcee430`):
  - **T10 — Restore removed experience**: mirroring the CV verbatim removed Tribuu (2021–2022) and Loopay Full Stack Developer (2023–2024) — user flagged they have MORE years than the CV shows. Restore both entries from `93c56a9~1` history (already in highlights shape), re-check iconMap coverage for their tags (T7 pruned some brands), newest-first order.
  - **T11 — Remove Loopay bullet**: delete the "$1M+ daily / 100+ merchants" highlight (EN+ES) per user. Note: $1M+ still appears in About bio — flagged to user.
- 2026-10-03: T10+T11 done (`acbfd4e`): 5 entries restored in newest-first order (Loopay TL → Galgo → Trebet → Loopay FSD 2023–24 → Tribuu 2021–22), Algolia/Zoom icons re-added, $1M+ bullet gone from experiences (still in About bio — pending user call). Spot-check tsc PASS. 13 commits ahead of main.
- OPEN: user hint "más experiencia, de más años" — resolved round 3: restoration approved as-is ("esta perfecto"), no pre-2021 roles.
- 2026-10-03: USER REVIEW ROUND 3:
  - **T12 — Kill $1M+ from About bio** (en+es) — user decision ("también matarla").
  - **T13 — Light-mode theme polish** — user: light mode ugly vs dark, "no se ve casi detalles". Direction: warm cohesive light theme — darker toasted amber for text-level accents (#B45309/#D97706 scale; bright amber fails WCAG on white), visible warm borders, soft shadows instead of glows, text contrast ≥ WCAG, hero gradient readable. Final visual sign-off = user on dev server.
- 2026-10-03: T12 done (`e880eff`): $1M+ claim removed from bio en/es. T13 done (`8b5dce8`): light scope — --color-primary #B45309 (4.81:1), muted text #78716C (4.59:1), borders #D6D3D1, warm tags, new --card-shadow/-hover + --border-card-hover vars (dark pinned byte-equal, additions only), hardcoded glows removed from ContactSection/ExperienceItem. Spot-check tsc PASS. 15 commits ahead of main.
- OPEN: user visual sign-off of new light mode (dev server, hot reload).
- 2026-10-03: USER REVIEW ROUND 4:
  - **T14 — ECS icon size bug**: EcsIcon renders a few px larger than siblings → chip grows → tag text wraps to 2 lines. Fix sizing convention on ALL custom SVGs (match react-icons rendered size) + prevent tag wrap.
  - **T15 — Light mode v2 (design pass, not a patch)**: user still dislikes light: "el fondo no se ve casi" (network barely reads) and overall less refined than dark. Root insight: dark lines are bright amber (brand energy); light lines are near-black (visible but dull). Direction: amber-toned (burnt/rust) lines+nodes in light for brand energy, warmer page paper instead of sterile white, refinement pass over surfaces (cards/tags/navbar/hero/buttons). Dark untouched.
- 2026-10-03: T14 done (`3afb2ce`): customIcon() factory mirrors IconBase (explicit width/height stamped, fallback 1em) — all 8 custom SVGs render identical box to react-icons; `.tag` nowrap + gap + flex-shrink-0 (labels one line, chips wrap whole). T15 done (`1bdeb77`): warm paper #FAF8F3, card #FFFEFB, network burnt amber rgba(180,83,9,0.37/0.20) with presence math 13.4% typical (band 10–14%), tag text #AD4E08 (surface-dependent catch), gradient end #C2680C (3.75:1 large), umber shadows, dark scope additions-only (+3 pinned lines). Spot-check tsc PASS. 17 commits ahead of main.
- OPEN: user visual sign-off light mode v2; then delivery decision (push+PR vs direct merge).
- 2026-10-03: USER REQUEST (final, "para cerrar perfecto") **T16 — Grab & pull nodes**: pointerdown near a node grabs it; near a line → nearest endpoint node "comes" to the hand; drag pulls it (spring), lines stretch, release springs back. Works at any depth ("inclusive las del fondo fondo") via pointer-ray at the node's z-plane. Guardrails: no hijack of interactive elements or text selection; reduced-motion = static (no grab); touch supported; 60fps (pick O(n) once per down).
- 2026-10-03: T16 done (`fb4a63b`, +267/−5): screen-space pick 24px nodes / 16px segments → nearest endpoint grabbed; drag plane frozen at pick-time z (deep layers draggable within their own layer); grab writes ONLY offsets[grabIndex] (basePositions sacred, reseed resets); alpha glow while held; guards via closest() over interactive + text elements; pointer capture + pointercancel/blur/tab-hidden spring-back; reduced-motion + dispose contracts verified. Spot-check tsc PASS. 18 commits ahead of main.
- 2026-10-03: T17 done (`6fee9c8`): playground total — .layer-content pointer-events-none on main+Footer roots, links/buttons re-enabled, guard selector interactive-only, cursor grab/grabbing.
- 2026-10-03: USER STRATEGIC REQUEST: site feels like a CV → Selected Work case studies. User provided 9 links; QA links rejected (security optics); verification: Galgo site strong, Trebet stores live, Loopay explorer public, SOBERANA/app.loopay are JS shells (narrative-only, app.loopay login-walled → excluded as CTA).
  - **T18 — Selected Work section (#work)**: 4 editorial case-study cards (01 Loopay Suite featured / 02 Galgo / 03 Trebet / 04 This site) with real links, artistic treatment, en/es. Hero → Work → About → Experience → Contact. Hard rule: NO $1M+ / 100+ merchants figures (user-killed claims).
  - **T19 — SEO + AI indexing**: full meta suite (og/twitter/canonical/theme-color), JSON-LD Person, og:image PNG (generated locally), llms.txt, robots.txt, sitemap.xml — target keyword "krespokiller".
- 2026-10-03: DEPLOYED. Merged feature/portfolio-3d-refresh → main (ff, ca33ffe→6a32337) and pushed; Pages workflow 37089217539 ran. User reviewed live and loves it ("me gusta mucho").
- 2026-10-03: USER REVIEW ROUND 6 (live) — **T20 content trims** (direct on main per user's deploy-now instruction):
  - Remove Galgo metric statement (1,000+ leads/day) and Trebet metric statement (MVP→production 1 month) — bullets stay.
  - Remove Loopay "API Docs" link (app.loopay.com/api/v1/explorer/) — SOBERANA link stays.
  - Delete card 04 (This Portfolio) entirely; grid 02–03 becomes 2-col; prune now-dead iconMap entries (SiThreedotjs/SiTailwindcss if unused); sync llms.txt (3 case studies, 5 links).
- 2026-10-03: T20 done (`bd6720b` on main): metrics + API link + card 04 removed, 4 live links (SOBERANA, galgo.com, Play, App Store), writer corrected brief miscount 5→4. Spot-check PASS, pushed, Pages run 37089926361. Local dev server killed (user reviews live only). FEATURE DELIVERED.
- 2026-10-03: USER: "ya como esta esta perfecto 100/100" — new round 7 (engine only, deploy direct to main):
  - **T21a — Instant re-grab**: user waits seconds before dragging another node after release — fix so pointerdown right after release picks immediately (diagnose release path: cooldown/pick exclusion/spring hysteresis).
  - **T21b — Node combining**: drag node near another → persistent bond (slightly brighter link), node's HOME relocates to drop point ("se mantengan allá"). Bond breaks if endpoints dragged >~2.5× LINK_DISTANCE apart later. Cap ~64 bonds, dropped on reseed, reduced-motion excluded, zero per-frame allocs.
  - Scope-down authorized by user if combining gets loco.
- 2026-10-03: T21 done (`de92c4d` on main): T21a root cause = physical (spring flight + repulsion displacing nodes beyond pick radius), fixed by dual-projection pick (render+lattice) + radii 24→36/16→24. T21b bonds: snap 0.8×LINK, home relocates, bond alpha 1.6×, FIFO cap 64, break at 2.5×LINK, reseed clears, zero component changes.
- 2026-10-03: USER REVIEW ROUND 8 (final polish, deploy direct):
  - **T22a — Kill light mode** (user: "matemos esa mierda" after two failed polish rounds): dark-only. Remove theme toggle + light scope + system detection; dark becomes THE theme. Restore path = git history.
  - **T22b — Mobile grab fix**: touch drag doesn't work (browser claims gesture for scroll → pointercancel). Fix = non-passive touchstart, conditional preventDefault ONLY when pick hits node/line; empty-area touches keep scrolling.
- 2026-10-03: T22 done (`a48b2e6` + `a3d30c5`): light mode REMOVED (dark is the brand; useTheme deleted, −207 lines, vars promoted to :root, engine theme observer removed, stories single-theme) + mobile grab via grabActive-gated touchstart preventDefault (pointerdown precedes touchstart; empty areas scroll, multi-touch releases, cancel path intact). Spot-check PASS, pushed bd6720b..a3d30c5, Pages run 37092739569 SUCCESS. FEATURE LIVE.

## Next step
User reviews live site. Optional follow-ups (not authorized): per-section prerender for case-study keyword SEO, code-splitting the three.js bundle.
- 2026-10-03: USER REVIEW ROUND 5 — grab works; content interposes in the center + text selects on drag. Product fork asked → **user chose "Playground total"**: **T17 — canvas owns the click**: content layers pointer-events-none (links/buttons/nav stay interactive), text selection sacrificed by design, engine's text-element guards removed (interactive guard kept as defense), cursor affordance grab/grabbing.

## Next step
User tests the grab interaction on dev server, then decides delivery: push + single PR, or merge to main (Pages auto-deploys).
