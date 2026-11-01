# Sadar Bazar Tunnel Training Simulator

> **Interactive DMRC station, tunnel, construction, and safety training prototype**

A browser-based 3D simulator for exploring a conceptual Delhi Metro Phase IV Sadar Bazar underground station. The application combines a stacked station box, TBM/NATM tunnel geometry, first-person exploration, route guidance, VR interaction, engineering reference data, and training scenarios.

> [!IMPORTANT]
> This is a training and visualization prototype. It is **not approved for operational, construction, structural, evacuation, or safety decisions**. Always use approved drawings, calculations, surveys, method statements, and operating procedures for real-world work.

## Quick navigation

- [What you can do](#what-you-can-do)
- [Run it locally](#run-it-locally)
- [Interactive controls](#interactive-controls)
- [VR experience](#vr-experience)
- [Engineering model](#engineering-model)
- [Architecture](#architecture)
- [Development commands](#development-commands)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## What you can do

### Explore the station

- Orbit around the complete station and tunnel model in overview mode.
- Enter first-person walk mode and move through the station levels.
- Walk up and down the three modeled stair flights.
- Use the lift to travel between station levels.
- Inspect interactive AFC gates, ticket machines, security equipment, PSDs, PIDS, benches, and emergency equipment.
- Open the engineering component library and jump to a component in the 3D model.

### Follow generated routes

- Use the generated journey graph to connect the concourse, upper platform, intermediate level, and lower platform.
- Press `G` in walk mode to show or hide the route guide.
- Use the VR wrist menu to toggle the same route guide.
- Follow waypoint markers through the station without relying on hard-coded visual labels.

### Learn from engineering references

- Review component descriptions, specifications, inspection protocols, and safety notices.
- Distinguish `Verified`, `Provisional`, and `Assumed` values.
- Review generic DMRC reference facts without confusing them with Sadar Bazar-specific design data.
- Track explored components through the library progress indicator.

### Try the VR mode

- Open the dedicated `/vr.html` entry point.
- Use WebXR controllers for teleportation, selection, and wrist-menu actions.
- Use the desktop VR preview when a headset is unavailable.
- View component hotspots as an efficient instanced marker set.

## Run it locally

### Requirements

- Node.js 18 or newer
- npm
- A modern browser with WebGL support
- Optional: a WebXR-compatible browser and headset for VR

### Install and start the desktop app

```bash
npm install
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/) after Vite starts.

The project is configured to use port `3000` and to listen on all host interfaces, which is useful when testing from another device on the same network.

### Start the VR entry point

```bash
npm run dev:vr
```

Then open [http://localhost:3000/vr.html](http://localhost:3000/vr.html).

For headset testing, serve the app from an HTTPS origin or a browser-supported secure development environment. WebXR availability depends on the browser, device, permissions, and runtime.

### Production preview

```bash
npm run build:all
npm run preview
```

The desktop production output is generated in `dist/`. The VR build is generated in `dist-vr/`. These generated directories are build artifacts and should not be committed unless the deployment process explicitly requires them.

## Interactive controls

### Overview mode

| Input | Action |
| --- | --- |
| Mouse drag | Orbit the camera |
| Mouse wheel | Zoom |
| Right mouse drag | Pan |
| `Tab` | Enter first-person walk mode |

### First-person walk mode

| Input | Action |
| --- | --- |
| `W` / `A` / `S` / `D` | Move |
| `Shift` | Sprint |
| Mouse | Look around after pointer lock |
| `E` | Interact with a nearby station object |
| `C` | Open or close the component library |
| `G` | Toggle the generated route guide |
| `Tab` | Return to overview mode |
| `Esc` | Release pointer lock |

The walk HUD also provides:

- Level fast travel
- Depth and reduced-level telemetry
- A station radar/minimap
- Lift destination controls
- Current interaction prompts
- Component library access
- Route-guide status

### VR mode

| Input | Action |
| --- | --- |
| Controller ray | Point at a menu, hotspot, or teleport target |
| Controller select | Activate the pointed item |
| Teleport target | Move around the current level |
| Wrist menu | Change levels, toggle hotspots, or toggle route guidance |
| Desktop preview keys `1`–`4` | Select the four walkable levels |

The VR scene uses the same station builders as the desktop experience while omitting heavy surface geology from the interior-focused VR path.

## Station levels and coordinate model

The simulator uses a world coordinate system where:

- World `Y = 0` represents ground surface level.
- Increasing depth is represented by increasingly negative `Y`.
- `X` runs across the station box.
- `Z` runs along the approximately 200 m station length.

The main walkable levels are:

- **Concourse** — approximately `-10.16 m`
- **Upper platform** — approximately `-16.31 m`
- **Intermediate level** — approximately `-24.46 m`
- **Lower platform** — approximately `-31.01 m`

These level definitions are read from [`src/data/stationSpec.ts`](./src/data/stationSpec.ts), while placements and openings are generated from [`src/data/stationLayout.ts`](./src/data/stationLayout.ts).

## Engineering model and data policy

The simulator intentionally separates source confidence from visual presentation.

### Confidence levels

- **Verified** — directly represented from an identified project or reference source.
- **Provisional** — derived or approximate and requiring confirmation.
- **Assumed** — architectural, training, or generic reference content used to make the prototype explorable.

Generic reference records explicitly identify themselves as generic DMRC references and not Sadar Bazar-specific values.

### Core data files

- [`src/data/stationSpec.ts`](./src/data/stationSpec.ts) — station levels, dimensions, RLs, tunnel data, and confidence metadata.
- [`src/data/stationLayout.ts`](./src/data/stationLayout.ts) — the shared placement manifest for slabs, stairs, lift, platforms, columns, openings, and circulation.
- [`src/data/components.json`](./src/data/components.json) — engineering component records consumed by the component library and VR hotspots.
- [`PROJECT_TRACKING.md`](./PROJECT_TRACKING.md) — architecture decisions, audit notes, milestone history, and known assumptions.

### Important limitation

The model is not a substitute for:

- Approved IFC/CAD/BIM geometry
- Geotechnical investigation
- Structural calculations
- Fire and life-safety approvals
- Accessibility or evacuation calculations
- Track, signalling, ECS, or PSD design packages
- Construction method statements
- DMRC operating rules

## Architecture

```text
src/
├── data/
│   ├── stationSpec.ts       Source-of-truth engineering values
│   ├── stationLayout.ts     Shared geometry and placement manifest
│   └── components.json      Library and hotspot records
├── scene/
│   ├── GroundBuilder.ts     Surface, soil, water, and site context
│   ├── StationBuilder.ts    Station box, slabs, walls, and columns
│   ├── TunnelBuilder.ts     TBM tunnels and NATM cross-passage
│   ├── CirculationBuilder.ts Stairs, lift, rails, and circulation hardware
│   └── StationInterior.ts   Interior systems and interactables
├── controls/
│   ├── FirstPersonControls.ts Walk physics and collisions
│   ├── OverviewControls.ts  Orbit camera behavior
│   └── WalkHUD.ts            Telemetry, minimap, prompts, and controls
├── navigation/
│   ├── journeyGraph.ts       Generated level graph and route points
│   ├── RouteGuide.ts         Three.js route visualization
│   └── walkableZones.ts      Manifest-derived teleport and minimap zones
├── vr/
│   ├── VRApp.ts              VR scene, menus, hotspots, and interaction
│   ├── locomotion.ts         Teleport and movement math
│   └── batch.ts               Static geometry batching
├── ui/
│   └── ComponentLibrary.ts   Search, filters, cards, and exploration state
└── training/
    ├── data/                 Training scenarios and learning objectives
    └── TrainingApp.ts        Training interface
```

### Shared manifest principle

The station layout manifest is designed to prevent the rendered geometry, movement system, VR teleporting, minimap, and tests from drifting apart. When a stair, lift, opening, platform, or circulation placement changes, update the manifest first and then update the related tests.

## Development commands

```bash
# Start the desktop development server
npm run dev

# Start the VR development server
npm run dev:vr

# Run all Vitest tests
npm test

# Type-check and build the desktop application
npm run build

# Type-check and build the VR application
npm run build:vr

# Build both applications
npm run build:all

# Preview the desktop production build
npm run preview

# Type-check without emitting build files
npx tsc --noEmit
```

## Validation

The test suite currently validates:

- Station geometry integrity and explicit clash allowances
- Duplicate geometry and z-fighting checks
- Banner/sprite cleanup and yellow safety-marking budgets
- Column clearances and stair headroom
- Stair risers, treads, slopes, and widths
- Platform passage width
- Walk-mode movement, stair sampling, collision, and teleport behavior
- Generated journey routes and route-guide points
- Manifest-derived walkable-zone projection
- VR locomotion, level data, hotspot loading, and render budgets
- Component-library exploration and progress calculations
- Training content and scenario metadata

Run the normal verification sequence before opening a pull request:

```bash
npx tsc --noEmit
npm test
npm run build:all
git diff --check
```

Expected output includes all Vitest files passing. Canvas-related `jsdom` warnings may appear because the optional `canvas` package is not installed; they are expected in the current test environment when tests still pass.

## Troubleshooting

<details>
<summary><strong>The page is blank or the 3D scene does not render</strong></summary>

Check that:

1. The browser supports WebGL.
2. Hardware acceleration is enabled.
3. The development server is still running.
4. The browser console does not report a module or asset error.
5. You opened the Vite URL rather than the source HTML file directly.
</details>

<details>
<summary><strong>Pointer lock or walk mode does not respond</strong></summary>

Click inside the application to give it focus, then press `Tab` to enter walk mode. Press `Esc` to release pointer lock. Some browsers require a user gesture before pointer lock is allowed.
</details>

<details>
<summary><strong>VR mode does not start</strong></summary>

Confirm that:

- The browser supports WebXR.
- The headset is connected and permitted.
- The page is served from a secure origin where required.
- The browser has permission to access the headset.

The desktop preview remains available for checking VR menus and scene logic without a headset.
</details>

<details>
<summary><strong>Build output is large</strong></summary>

Three.js and the station scene are intentionally bundled for the prototype. Vite may report a chunk-size warning after minification; this is currently a warning rather than a build failure. Prefer targeted code splitting only after measuring startup and runtime performance.
</details>

<details>
<summary><strong>Tests print canvas implementation warnings</strong></summary>

The jsdom environment does not implement every `HTMLCanvasElement` operation without the optional `canvas` package. These warnings are known and do not indicate a failing test when the Vitest summary is green.
</details>

## Contributing

1. Create a focused branch from the current development branch.
2. Read [`PROJECT_TRACKING.md`](./PROJECT_TRACKING.md) before changing station geometry.
3. Update [`stationLayout.ts`](./src/data/stationLayout.ts) for shared placement changes.
4. Keep verified, provisional, and assumed values clearly distinguished.
5. Add or update focused tests for behavior and geometry changes.
6. Run type-checking, tests, builds, and `git diff --check`.
7. Keep generated build directories out of commits unless deployment requires them.
8. Explain any intentional behavior or UX change in the pull request.

## Project status

The current branch contains the completed station-structure phases tracked in [`PROJECT_TRACKING.md`](./PROJECT_TRACKING.md), including:

- Layout-manifest-based station structure corrections
- Generated journey guidance
- Floating-label and helper cleanup
- Expanded component-library references
- VR hotspot batching
- Manifest-derived walkable zones

## License

This repository does not currently declare a software license. Do not assume that project drawings, reference documents, or third-party source material are licensed for redistribution.
