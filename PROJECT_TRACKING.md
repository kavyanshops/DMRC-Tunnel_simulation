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
- **Permanent Safety Banner**: *"Training prototype — not approved for operational decisions."*
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
| *Platform Width / Length* | $4.80\text{ m}$ wide $\times 140\text{ m}$ long | Standard Phase IV rolling stock envelope | **ASSUMED** |
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

- [ ] **M2: Walk Mode (First-Person Explorer)**
  - [ ] FPS controller: WASD movement, mouse look via Pointer Lock, Shift to sprint.
  - [ ] Floor slab and wall AABB collision system.
  - [ ] Level transitions: vertical stairs, animated lifts, escalators.
  - [ ] In-game HUD: real-time level identifier, depth below ground (m), compass.
  - [ ] Minimap with live player marker ("you are here") and fast-travel waypoints.
  - [ ] Git commit after testing.

- [ ] **M3: Component Library & Interaction System**
  - [ ] Raycasting interaction (`[E]` key inspects highlighted objects).
  - [ ] Interactive doors and fare gates with stateful animations.
  - [ ] `src/data/components.json` with 15+ verified/provisional/assumed records.
  - [ ] Searchable, filterable Component Library modal with "Show in model" link.
  - [ ] "Explored" badge progression tracking in session state.
  - [ ] Strict safety boundary: safety equipment inspection only (no operational switches in walk mode).
  - [ ] Git commit after testing.

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
