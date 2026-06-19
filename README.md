# Particle Field

An interactive **GPGPU particle field** rendered with [Three.js](https://threejs.org/) and built,
bundled, and tested with [bun](https://bun.sh/). Hundreds of thousands of particles are simulated
entirely on the GPU and react to the pointer in real time, finished with bloom and filmic tone
mapping on a dark, cinematic stage.

> Status: **Foundation milestone.** The render harness, build tooling, and CI are in place; the
> particle centerpiece lands in the next milestone.

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Runtime / PM   | bun                                     |
| Bundler / dev  | Vite                                    |
| Language       | TypeScript (strict)                     |
| Rendering      | Three.js                                |

## Getting started

```bash
bun install      # install dependencies
bun run dev      # start the Vite dev server with HMR
```

Then open the URL printed by Vite.

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `bun run dev`       | Dev server with hot module replacement       |
| `bun run build`     | Typecheck (`tsc --noEmit`) then production build |
| `bun run preview`   | Serve the production build locally           |
| `bun run typecheck` | Type-check only, no emit                     |

## Architecture

- `src/core/Engine.ts` — reusable render harness: renderer/scene/camera lifecycle, a clamped
  delta-timed loop, DPR-capped resize, auto-pause when the tab is hidden, and deterministic
  teardown.
- `src/scenes/` — drawable systems implementing the `Tickable` interface and added to the engine.
- `src/main.ts` — entry point: wires a scene into the engine and starts the loop.

## License

MIT
