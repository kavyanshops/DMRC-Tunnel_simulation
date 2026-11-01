# Sadar Bazar Tunnel Training Simulator

A browser-based DMRC Sadar Bazar underground station and tunnel training prototype built with Vite, TypeScript, and Three.js.

> **Prototype only:** This simulator is for training and visualization. It is not approved for operational, construction, or safety decisions.

## Features

- Interactive 3D overview of the stacked Sadar Bazar station and tunnel system.
- First-person walk mode with collision handling, stair movement, lift travel, and station interactions.
- Generated route guidance between concourse, platform, intermediate, and lower levels.
- VR-compatible experience at `/vr.html`, including teleportation, level selection, hotspots, and route guidance.
- Engineering component library with confidence labels: `Verified`, `Provisional`, and `Assumed`.
- Manifest-derived walkable zones shared by walk mode, VR teleportation, and the walk-mode minimap.
- Performance-conscious geometry batching and instanced meshes for VR.

## Requirements

- Node.js 18 or newer
- npm
- A modern browser with WebGL support
- Optional: WebXR-compatible browser and headset for VR

## Getting started

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173/`.

For the VR entry point:

```bash
npm run dev:vr
```

Then open `/vr.html` from the Vite server.

## Controls

### Overview mode

- Mouse: orbit, pan, and zoom
- `Tab`: switch between overview and first-person walk mode

### Walk mode

- `W A S D`: move
- `Shift`: sprint
- Mouse: look around after pointer lock
- `E`: interact with station equipment
- `C`: open the component library
- `G`: toggle the generated route guide
- `Tab`: return to overview mode
- `Esc`: release pointer lock

The walk HUD also provides level fast travel, station telemetry, a minimap, and lift controls.

### VR mode

- Point and select with a controller
- Use the wrist menu to change levels, toggle hotspots, and toggle the route guide
- Use teleport targeting for movement
- Desktop preview supports keyboard level shortcuts

## Development commands

```bash
npm run dev          # Start the desktop development server
npm run dev:vr       # Start the VR development server
npm test             # Run the Vitest suite
npm run build        # Type-check and build the desktop app
npm run build:vr     # Type-check and build the VR app
npm run build:all    # Build desktop and VR bundles
npm run preview      # Preview the desktop production build
npx tsc --noEmit     # Type-check without emitting files
```

## Project structure

```text
src/
├── data/                 Station specification and layout manifest
├── scene/                Three.js station, tunnel, circulation, and interior builders
├── controls/             Overview, first-person movement, HUD, and minimap
├── navigation/           Journey graph, route guide, and walkable zones
├── vr/                   VR application, locomotion, hotspot handling, and batching
├── ui/                   Component library and application UI
└── training/             Training scenarios and learning content
```

Important data sources:

- `src/data/stationSpec.ts` — verified and provisional engineering values.
- `src/data/stationLayout.ts` — shared station placement and opening manifest.
- `src/data/components.json` — component-library records and confidence metadata.
- `PROJECT_TRACKING.md` — architecture decisions, audit notes, and milestone status.

## Engineering data policy

The model distinguishes between verified project values and assumed architectural or training values. Assumed records are explicitly labelled and generic reference records identify that they are not Sadar Bazar-specific. The simulator should not be used as a substitute for approved drawings, calculations, surveys, or operational procedures.

## Validation

The current test suite covers:

- Station geometry integrity and clash checks
- Stair dimensions, headroom, platform passage, and walkability
- Walk-mode movement and collision regression tests
- Generated journey routes and walkable-zone projections
- VR data, locomotion, hotspot loading, and render budgets
- Component-library exploration and progress behavior

Run the complete validation set with:

```bash
npm test
npm run build:all
```

## License

This repository does not currently declare a software license.
