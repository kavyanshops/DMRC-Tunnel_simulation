# Sadar Bazar Tunnel Training Simulator — Project Tracking & Architecture Log

> **Prototype Classification**: Training Prototype — Not approved for operational decisions.  
> **Target Project**: Delhi Metro Phase IV — Sadar Bazar Underground Station (Cut-and-cover stacked station & NATM/TBM tunnels).  
> **Tech Stack**: Vite + TypeScript + Three.js (Pure client-side, zero backend, optimized for student laptops).

---

## 1. Project Overview & Architectural Thinking ("What We Think & Rationale")

### 1.1 Engineering Rigor & Data Integrity
Primary source references:
- **Singh & Banerjee**, *"Concept Design of Sadar Bazar Underground MRTS Station in Congested Area, Delhi"* (ITA-AITES WTC 2022) [WTC Fig 15].
- **Gall Zeidler Consultants DC-05 project sheet** [GZ Fig 2].
- **Sadar Bazar Tunnel Data and Measurements document** (corrected 27 Oct 2026).

**Core Philosophy**:
- **Zero Invention of Engineering Data**: Every geometric parameter in the station model is explicitly sourced from the engineering literature or tagged `[ASSUMED]`.
- **Coordinate System**: World origin $(0, 0, 0)$ is set to **Ground Surface Level ($+220.00\text{ m RL}$)**. Thus, depths below ground are naturally negative $Y$ values, directly matching physical reality (e.g. Upper rail is $Y = -17.40\text{ m}$, Lower rail is $Y = -32.10\text{ m}$).
- **Single Source of Truth**: All dimensions and confidence levels are maintained in `src/data/stationSpec.ts`.

### 1.2 The Known Conflict Handling
- **Discrepancy**: WTC 2022 paper text states the stacked tunnels have a clear gap under one tunnel diameter ($< 6.35\text{ m}$), yet the structural cross-section in Fig 15 explicitly places the Upper Rail at $+202.60\text{ m RL}$ and the Lower Rail at $+187.90\text{ m RL}$ (a vertical differential of $14.70\text{ m}$).
- **Handling**: In the 3D model, rails and platforms are positioned strictly at the drawing's stated RLs ($+202.60\text{ m}$ and $+187.90\text{ m}$). A permanent visible warning banner is attached to the tunnel asset:  
  *`"Gap unverified - ask authors/DMRC."`*

### 1.3 UI/UX Design System: Real-Time 3D Cinematic Atmosphere
- **Pure WebGL 3D Background**: Removed static/pre-rendered video. The homepage is now powered by a live, real-time Three.js 3D tunnel camera looking down the tracks toward the illuminated portal, with drifting atmospheric dust particles and lighting.
- **Genuine 3D Cursor Tracking**: Mouse movements directly steer the 3D perspective camera with smooth interpolation ($lerp = 0.045$), creating realistic depth and parallax.
- **Interactive 3D Cards**: Four experience cards with dynamic 3D tilt on hover (`perspective(1000px) rotateX/Y`), custom status pills, and glow borders.
- **Clean Focus**: Removed secondary buttons; hero focuses on the single primary action (`ENTER 3D MODEL`).
- **Runtime Disclaimer**: Removed from the application UI; prototype assumptions remain documented in this file.
- **Performance**: High performance on student laptops via shared standard materials, low poly counts, and zero heavy textures.

---

## 2. Verified Data Audit vs. Assumed Parameters

| Feature / Element | Dimension / Parameter | Source / Citation | Status |
| :--- | :--- | :--- | :--- |
| **Ground Datum** | $+220.00\text{ m RL}$ (World $Y = 0.00$) | WTC Fig 15 | **Verified** |
| **Station Box Width** | $13.40\text{ m}$ (Grids D to A: $6.70 + 2.63 + 4.07\text{ m}$) | WTC Fig 15 | **Verified** |
| **Station Box Length** | $\approx 200\text{ m}$ ($10\text{ m}$ grid spans; drawing label $\approx 201\text{ m}$) | WTC Fig 15 | **Provisional** |
| **Soil Cover on Roof** | $4.36\text{ m}$ above roof slab | WTC Fig 15 annotation | **Verified** |
| **Roof Slab Underside** | $+214.64\text{ m RL}$ ($5.36\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Roof Slab Thickness** | $\approx 1.00\text{ m}$ | Derived ($215.64 - 214.64$) | **Provisional** |
| **Concourse Level** | $+209.84\text{ m RL}$ ($10.16\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Upper Platform** | $+203.69\text{ m RL}$ ($16.31\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Upper Rail Level** | $+202.60\text{ m RL}$ ($17.40\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Upper Undercroft** | $+201.54\text{ m RL}$ ($18.46\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Intermediate Level** | $+195.54\text{ m RL}$ ($24.46\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Lower Platform** | $+188.99\text{ m RL}$ ($31.01\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Lower Rail Level** | $+187.90\text{ m RL}$ ($32.10\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **Lower Undercroft** | $+186.09\text{ m RL}$ ($33.91\text{ m}$ depth) | WTC Fig 15 | **Verified** |
| **TBM Tunnel Outer $\varnothing$** | $6.35\text{ m}$ | Gall Zeidler Consultants DC-05 sheet | **Verified** |
| **TBM Tunnel Inner $\varnothing$** | $5.80\text{ m}$ (label $\varnothing 5800$) | GZ Fig 2 | **Verified** |
| **TBM Segment Lining** | $\approx 0.275\text{ m}$ ($275\text{ mm}$) | Derived: $(6.35 - 5.80) / 2$ | **Verified** |
| **Track Offset from Centre** | $1.885\text{ m}$ | Sadar Bazar Tunnel Data doc | **Verified** |
| **NATM Cross-Passage Outer $\varnothing$** | $4.10\text{ m}$ | Gall Zeidler Consultants DC-05 sheet | **Verified** |
| **Surface Road Width** | $17.00\text{ m}$ between footpaths | WTC paper text | **Verified** |
| **Building Clearance** | $20.00\text{ -- }21.00\text{ m}$ between building lines | WTC paper text | **Verified** |
| **Geological Stratum 1** | $0.00\text{ -- }4.50\text{ m}$: Sandy silt | WTC paper geotechnical notes | **Verified** |
| **Geological Stratum 2** | $4.50\text{ -- }21.50\text{ m}$: Weathered quartzite | WTC paper geotechnical notes | **Verified** |
| **Geological Stratum 3** | $> 21.50\text{ m}$: Fresh quartzite bedrock | WTC paper geotechnical notes | **Verified** |
| **Groundwater Table** | $5.00\text{ -- }6.00\text{ m}$ depth ($\approx +214.50\text{ m RL}$) | WTC paper text | **Verified** |
| **Heritage Brick Sewer** | $\approx 10\text{ m}$ depth crossing station | WTC paper text | **Provisional / Assumed** |
| *Platform Width / Length* | $6.10\text{ m}$ wide (widened from 4.80 in M2b) $\times 140\text{ m}$ long | Standard Phase IV rolling stock envelope | **ASSUMED** |
| *NATM Lining Thickness* | $0.30\text{ m}$ shotcrete + cast concrete | Standard mining practice | **ASSUMED** |
| *Cross-Passage Spacing & Count*| 1 illustrative cross-passage placed at $35\text{ m}$ | PRD section 6 | **ASSUMED** |
| *Concourse Turnstile / Egress* | 8 fare gates, 2 customer kiosks, stairs/lifts | Standard transit station layout | **ASSUMED** |

---

## 3. Milestones & Progress Tracker (TODO List)

- [x] **M1: Scale 3D Scene & Overview Mode (COMPLETED & VERIFIED)**
  - [x] Initial data audit and mathematical coordinate definitions.
  - [x] Vite + TypeScript + Three.js setup.
  - [x] Single source of truth in `src/data/stationSpec.ts`.
  - [x] Stratified ground block (silt, weathered rock, bedrock, water table, old sewer).
  - [x] 13.4m station box with 5 floor slabs, cutaway diaphragm walls, and structural columns.
  - [x] Stacked TBM running tunnels and 1 illustrative NATM cross-passage.
  - [x] Assumed geometry visual tagging system (high-res 3D badges + dashed outlines).
  - [x] Overview camera controller (smooth orbit/pan/zoom) and layer toggles.
  - [x] Cinematic UI integration (permanent banner + cursor-reactive hero based on `scene_7.mp4`).
  - [x] Browser testing & verification.

- [x] **M2: Walk Mode (First-Person Explorer) (COMPLETED & VERIFIED)**
  - [x] FPS controller: WASD movement (fixed W/S direction), mouse look via Pointer Lock, Shift to sprint (3.8 / 7.2 m/s).
  - [x] Physical collision system preventing walking through walls:
    - [x] Diaphragm wall and headwall boundary clamping ($X \in [-5.9, 5.9]$, $Z \in [-95, 95]$).
    - [x] Structural column radial collision (0.80m clearance around all 10m grid columns).
    - [x] Elevator shaft AABB collision (blocks entry unless door open and approaching opening).
    - [x] Platform Screen Doors (PSD) track edge barrier on passenger platforms (stops falling onto track bed).
    - [x] Concourse Automatic Fare Collection (AFC) barrier (blocks crossing turnstile line unless tapped open).
  - [x] High-Visibility Architectural Staircases:
    - [x] Uncovered stairwell floor/ceiling voids so staircases and lower platforms are directly visible from concourse.
    - [x] Polished light granite treads with high-contrast amber/yellow safety edge nosing strips (`#f59e0b`).
    - [x] Polished stainless steel handrails and tempered safety glass balustrades.
    - [x] Concourse floor perimeter safety balustrade around stair opening with yellow approach tactile paving.
    - [x] Suspended illuminated stair wayfinding signage ("PLATFORM 1 & 2 ⬇ STAIRS / सीढ़ियां").
    - [x] Dedicated overhead downlights on all 3 flights (Stair 1, Stair 2, Stair 3).
  - [x] StationInterior subsystem with authentic Delhi Metro finishes:
    - [x] Suspended acoustic baffle ceiling panels with overhead utility ducts and fire sprinkler pipes.
    - [x] Polished granite floor tile textures and tactile warning/guidance paving.
    - [x] Vitrified enamel wall cladding panels with DMRC color accent band.
    - [x] Ballastless track plinth with dual UIC 60 steel rails and 3rd power rail.
    - [x] DMRC AFC turnstile gates with card reader pads, LED status, and motorized acrylic flaps.
    - [x] DMRC Ticket Vending Machines (TVMs) with interactive smart card recharge interface.
    - [x] Customer Care & Information Booth with safety glass partition.
    - [x] Security checkpoint with Door Frame Metal Detectors (DFMD) and baggage X-ray scanner.
    - [x] Platform Screen Doors (PSD) with header boxes and door indicators.
    - [x] Platform Passenger Information Display System (PIDS) electronic LED countdown hanging signs.
    - [x] Stainless steel platform waiting benches (interactive sit/stand eye height toggle).
    - [x] Emergency Stop Plunger (ESP) column boxes.
    - [x] High-res bilingual wayfinding signage ("SADAR BAZAR / सदर बाज़ार", "WAY OUT / EXIT 1 & 2").
  - [x] In-game Walk HUD & Interactivity:
    - [x] Dynamic reticle target highlight (`.walk-reticle.has-target`) when aiming at interactive objects.
    - [x] Reticle prompt pill (`[E] <ACTION TEXT>`).
    - [x] Interactive modal card with DMRC branding, subsystem telemetry, and actions (e.g. Quick Recharge ₹100, Tap Card).
    - [x] Compass tape, level badge, depth/RL telemetry, fast-travel dropdown, 2D radar minimap with interactive markers.
  - [x] Floor slab snapping with smooth stair slope interpolation (`computeFloorHeightAt`).
  - [x] 3 physical staircases with treads, risers, ramp backing, and handrails connecting all levels.
  - [x] Glass & steel animated elevator cabin with sliding doors, call buttons, and vertical lock.
  - [x] Vitest: 28/28 tests passing.
  - [x] Vite production build passing with 0 errors.
  - [x] Git commit after testing.

- [ ] **M2b: Station structure fix (branch `fix/station-structure`, IN PROGRESS: Phases A-B done, C-G pending)**
  - [x] Phase A: `src/scene/__tests__/stationIntegrity.test.ts` written first and failing on the audited defects.
  - [x] Phase B: `src/data/stationLayout.ts` is the single layout manifest (grid, stairs, lift, platform, AFC, benches, ESP, slabs). Slabs, platform decks, floor finishes, ceilings and LED runs are generated around openings **derived** from the stairs and the lift (`subtractRects`); nothing is hand-typed.
  - [ ] Phase C: walkable zones from the manifest (walk mode + VR + minimap).
  - [x] Phase D: generated journey graph, intermediate-level route floor strip, and hidden-by-default guided route in walk mode (`G`) and VR wrist menu.
  - [ ] Phase E: banners/yellow. Phase F: library records. Phase G: optimisation.

  **Decisions (Phase B)**
  | Decision | Choice | Why |
  | :--- | :--- | :--- |
  | Column line | **X = -0.7, ASSUMED** (was -0.5 in code, "grid C = 0" in a comment) | No Sadar Bazar WTC Fig 15 / GZ Fig 2 file is in the repo, so it cannot be verified. At -0.7 the column face (-0.25) clears the 0.4 m platform-edge tactile strip. |
  | Stair width / x | **2.20 m (spec), X -3.8..-1.6** (was 2.6 m, X -2.8..-0.2) | Spec value; 0.45 m clear of the column face (rule >= 0.4 m). |
  | Stair steps | 35 / 46 / 37 steps, riser 176-177 mm, tread 457 / 391 / 432 mm, slope 21.0 / 24.4 / 22.3 deg | Was 24 steps per flight = 256-340 mm risers (above the 180 mm limit). Vertical datum unchanged (Verified). No mid landing was needed. |
  | Platform passage | Option (c): **platform widened 4.80 -> 6.10 m** (X -5.9..0.2, track edge unchanged) | Options (a) shift lift/furniture and (b) move stair landings to the ends cannot give 2.0 m beside a mid-platform stair on 4.8 m. Measured narrowest clear lane: **2.15 m** on both platforms (test `platform passage`). |
  | Lift | Moved to X -4.56, Z 12.0, doors +Z, 1.5 m lobby; cuts through concourse, upper deck, undercroft and intermediate slabs | Old position sat on top of stair 1 and the platform deck. |
  | AFC gate line | **Z = -15** (was Z = -20) | Gates at Z = -20 sat on the column row. Schematic duplicate gates deleted. Unpaid side keeps TVMs/customer care/security. |
  | ESP | On the **west** face of the column at Z = -10 | Old boxes were inside the column. |
  | Under-stair space | Solid (steps run down to the landing floor wherever headroom would be < 2.2 m) | Not walkable. |
  | Column / deck | `column <-> deck` is whitelisted | The 0.35 m deck is a topping cast around the full-height column. |
  | Column height | Roof underside to top of base slab (was 28 m, floating 0.9 m above the base slab) | Geometry fix. |

  **ASSUMED values changed or added in M2b** (all keep the `Assumed` tag): platform width 4.80 -> 6.10 m; column line X -0.7; stair X -3.8..-1.6 and step counts; lift X -4.56 / Z 12; AFC line Z -15; bench X -5.55 and Z -55 / 45 / 55; PIDS Z +/-40; name signs Z +/-55; ESP at the column west face.

- [x] **M3: Component Library & Interaction System (COMPLETED & VERIFIED)**
  - [x] `src/data/components.json` with 18 verified/provisional/assumed records across 5 engineering disciplines:
    - Structural: D-Wall, Roof Slab, Concourse Slab, RC Grid Columns
    - Track & Tunnel: Upper TBM Tunnel, Lower TBM Tunnel, NATM Cross-Passage CP-01, UIC 60 Track Plinth, Traction Third Rail
    - Geotechnical: Historical Heritage Brick Sewer, Hydrogeological Water Table & Quartzite Strata
    - Transit Systems: AFC Turnstiles, TVM Kiosks, PIDS Electronic Displays, Panoramic Glass Elevator
    - Life Safety: Full-Height PSDs, Emergency Stop Plunger (ESP), Multi-Level Egress Staircases
  - [x] Searchable, filterable Component Library modal UI (`src/ui/ComponentLibrary.ts`):
    - [x] Instant text search across English & Hindi names, categories, descriptions, and technical specs.
    - [x] Category filter pills (All, Structural, Track & Tunnel, Transit Systems, Life Safety, Geotechnical).
    - [x] Confidence filter pills (All, Verified, Provisional, Assumed).
    - [x] "Show in 3D Model" button (navigates camera in overview or teleports player in walk mode).
    - [x] Technical specifications expansion with inspection protocol checklists and safety notices.
  - [x] "Explored" progression tracking:
    - [x] Persists in `sessionStorage` (`dmrc_explored_components_v1`).
    - [x] Real-time progress bar ("X / 18 Explored · Y%").
    - [x] Floating badge in Walk HUD and Overview HUD ("Library [C]").
    - [x] Inspecting any component via `[E]` in walk mode or via "Show in Model" automatically marks it explored.
  - [x] Strict safety boundary: safety equipment inspection only (no operational switches in walk mode).
  - [x] Unit test suite (`src/ui/__tests__/componentLibrary.test.ts`): data integrity, progression, navigation, and shortcuts.
  - [x] Git commit after testing.

- [ ] **M4: Deterministic Bird's-Eye Simulation Framework**
  - [ ] Top-down orthographic camera with pan/zoom (walk mode locked out).
  - [ ] Deterministic tick-based state machine (guaranteeing exact reproducible restarts).
  - [ ] Unified simulation HUD: Timeline controls, Event Log, Live Scenario Telemetry Panel (`SIMULATED`), Legend, Debrief.
  - [ ] Git commit after testing.

- [ ] **M5: Scenario 1 — Tunnel Fire & Smoke Emergency**
  - [ ] Configured fire origin point in tunnel segment.
  - [ ] Progressive smoke spread and thermal plume visualization.
  - [ ] Dynamic affected zones, ventilation fan state, and alarm escalation.
  - [ ] Debrief modal with approved safety review disclaimer.
  - [ ] Git commit after testing.

- [ ] **M6: Scenario 2 — Water Ingress & Flooding Emergency**
  - [ ] Configured leak location at deep undercroft/tunnel wall near water table/sewer zone.
  - [ ] Progressive water volume accumulation and track inundation.
  - [ ] Drainage sump pump telemetry and evacuation route advisories.
  - [ ] Comprehensive post-incident debrief.
  - [ ] Git commit after testing.

- [ ] **M7: Exploration Checklist, Tour & Performance Polish**
  - [ ] Guided onboarding tour with level-by-level training objectives.
  - [ ] Exploration checklist with persistent session progress.
  - [ ] Settings menu: mouse sensitivity, Y-axis invert, low-spec graphics mode (for student laptops).
  - [ ] Git commit after testing.

- [ ] **M8: Automated Tests & Final Documentation**
  - [ ] State machine determinism test suite.
  - [ ] Complete `README.md` auditing all ASSUMED parameters and source traceability.
  - [ ] Final git commit.

---

## 4. Construction Training Module (isolated add-on, `src/training/`)

Entry: homepage card "Construction Training" -> `#construction-training` (lazy-loaded chunk). Legacy Explorer/scene code is preserved completely untouched.

- [x] Training Hub with role selection (Worker / Site Engineer / Safety-Controller) and per-role checklist
- [x] Construction Sequence Trainer (12 stages, timeline scrub, schematic visual states, dependencies, checkpoint questions)
- [x] Monitoring Dashboard (6 SIMULATED parameters, thresholds, trends, alert states, anomaly flagging)
- [x] Learning objectives (`data/learningObjectives.ts`), assessment rubric, session report with JSON/CSV export
- [x] Decision-based Fire Emergency Scenario (`src/training/data/fireDecisionScenario.ts`, `src/training/scenarios/`):
  - [x] 5 sequential decision points: evacuation vs battery extinguishment, smoke back-layering vs critical velocity, CP-01 pressurisation vs compartmentation, 25kV traction earthing & PTW, post-fire gas purge.
  - [x] Real-time elapsed timer, live simulated telemetry cards, instant consequence feedback, and event log.
  - [x] Scored debrief with required SME disclaimer.
- [x] Decision-based Water Ingress / Flooding Scenario (`src/training/data/floodingDecisionScenario.ts`, `src/training/scenarios/`):
  - [x] 5 sequential decision points: inflow surge & sump pump staging, soil fines wash-out & heritage building tilt, lower rail submergence & test train halt, polyurethane chemical grouting, megger testing & recovery.
  - [x] Real-time elapsed timer, live simulated telemetry cards, instant consequence feedback, and event log.
  - [x] Scored debrief with required SME disclaimer.
- [x] Vitest suite: 13/13 tests passed covering data integrity, simulation determinism, scenario scoring, and UI flow (`npm test`).
- [x] Browser visual verification & recording completed.

SME-review required: every stage description, checkpoint, scenario, and monitoring threshold is tagged ASSUMED/Provisional. Thresholds and telemetry are illustrative (`SIMULATED — not real telemetry`).
