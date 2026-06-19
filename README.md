# Particle Field

An interactive **GPGPU particle field** rendered with [Three.js](https://threejs.org/) and built,
bundled, and tested with [bun](https://bun.sh/). Roughly **half a million particles** (708²) are
simulated entirely on the GPU and react to the pointer in real time, driven by a divergence-free
curl-noise flow and finished with bloom and filmic tone mapping on a dark, cinematic stage.

## Highlights

- **GPGPU simulation** — position and velocity live in floating-point data textures, ping-ponged
  each frame by `GPUComputationRenderer`. The CPU never touches a particle after seeding.
- **Organic motion** — a divergence-free curl-noise field drives the flow while a soft spring holds
  the cloud to a Fibonacci-sphere shell.
- **Interactive** — the pointer (or keyboard) attracts particles, and pressing scatters them.
- **Cinematic finish** — additive point rendering through UnrealBloom + ACES filmic tone mapping.
- **Resilient** — WebGL2 capability gate with a graceful fallback, GL context-loss recovery,
  `prefers-reduced-motion` support, and full keyboard + assistive-tech accessibility.

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Runtime / PM   | bun                                     |
| Bundler / dev  | Vite 6                                  |
| Language       | TypeScript (strict)                     |
| Rendering      | Three.js (GPGPU + post-processing)      |
| Lint / format  | Biome                                   |
| Unit tests     | `bun test`                              |
| E2E smoke      | Playwright                              |

## Getting started

```bash
bun install      # install dependencies
bun run dev      # start the Vite dev server with HMR
```

Then open the URL printed by Vite.

## Controls

| Input                         | Action                                            |
| ----------------------------- | ------------------------------------------------- |
| Move pointer                  | Attract particles toward the cursor               |
| Press / hold pointer          | Scatter particles outward                         |
| Arrow keys / WASD             | Move the virtual attractor (keyboard)             |
| Space                         | Scatter (keyboard)                                |
| Backtick (`` ` ``)            | Toggle the developer stats HUD                    |
| `?stats` query param          | Start with the stats HUD visible                  |

The experience respects `prefers-reduced-motion`: motion is calmed and the camera drift is disabled.

## Scripts

| Script               | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `bun run dev`        | Dev server with hot module replacement               |
| `bun run build`      | Typecheck (`tsc --noEmit`) then production build      |
| `bun run preview`    | Serve the production build locally (port 4173)        |
| `bun run typecheck`  | Type-check only, no emit                             |
| `bun run lint`       | Lint + format check with Biome                       |
| `bun run lint:fix`   | Apply Biome lint + format fixes                      |
| `bun run format`     | Format the codebase with Biome                       |
| `bun test src`       | Run unit tests (scoped to `src/`)                    |
| `bun run test:e2e`   | Build + serve, then run Playwright smoke tests        |

> Note: run unit tests as `bun test src`, not bare `bun test`. bun's runner also matches
> `*.spec.ts`, and the Playwright specs under `tests/e2e/` must run via `bun run test:e2e` instead.

## Architecture

- `src/core/Engine.ts` — reusable render harness: renderer/scene/camera lifecycle, a clamped
  delta-timed loop, DPR-capped resize via `ResizeObserver`, auto-pause when the tab is hidden,
  a pluggable render step (so a scene can drive its own post-processing composer), context-loss
  handling, and deterministic teardown.
- `src/core/capabilities.ts` — WebGL2 / reduced-motion feature detection.
- `src/core/math.ts` — pure, unit-tested helpers (Fibonacci-sphere direction, exponential damping).
- `src/core/observability.ts` — dependency-free error + performance reporting (the `report` sink is
  the seam for wiring a real backend).
- `src/scenes/ParticleField.ts` — the centerpiece GPGPU system and its GLSL shaders under
  `src/scenes/shaders/`.
- `src/ui/` — DOM overlays: intro hint, WebGL fallback panel, and the developer stats HUD.
- `src/main.ts` — entry point: capability gate, engine + scene wiring, lifecycle.

## Deployment

The build is a static, dependency-light SPA (`base: './'`) that drops onto any static host. Three.js
is split into its own long-lived cache chunk, and hashed assets are served `immutable`.

`public/_headers` ships a strict **Content-Security-Policy** plus `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options`, and aggressive caching for `/assets/*`. Hosts that read
`_headers` (Cloudflare Pages, Netlify) apply these automatically. On other hosts, replicate the
equivalent response headers at the CDN/server layer — they are the only required manual deploy step.

## License

MIT
