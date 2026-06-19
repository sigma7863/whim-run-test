import { ACESFilmicToneMapping, Clock, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

/** Anything that wants a per-frame update tick from the {@link Engine}. */
export interface Tickable {
  update(dt: number, elapsed: number): void;
  dispose?(): void;
}

export interface EngineOptions {
  /** Hard cap on device pixel ratio. Bounds fragment cost on hi-DPI screens. */
  maxPixelRatio?: number;
}

/**
 * Minimal, reusable render harness around a single WebGL canvas.
 *
 * Responsibilities kept here so feature code stays focused on *what* to draw:
 *  - renderer / scene / camera lifecycle
 *  - a clamped, delta-timed animation loop
 *  - DPR-capped, observer-driven resize
 *  - automatic pause when the tab is hidden (saves battery / GPU)
 *  - deterministic teardown via {@link dispose}
 */
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  private readonly canvas: HTMLCanvasElement;
  private readonly clock = new Clock();
  private readonly tickables = new Set<Tickable>();
  private readonly maxPixelRatio: number;
  private readonly resizeObserver: ResizeObserver;
  private running = false;

  constructor(canvas: HTMLCanvasElement, options: EngineOptions = {}) {
    this.canvas = canvas;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  /** Register a tickable and return it for fluent assignment. */
  add<T extends Tickable>(tickable: T): T {
    this.tickables.add(tickable);
    return tickable;
  }

  remove(tickable: Tickable): void {
    this.tickables.delete(tickable);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    // Flush any time accumulated while paused so the next frame steps cleanly.
    this.clock.getDelta();
    this.renderer.setAnimationLoop(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private readonly tick = (): void => {
    // Clamp dt so a long pause (alt-tab, breakpoint) can't fling the simulation.
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    const elapsed = this.clock.elapsedTime;
    for (const tickable of this.tickables) tickable.update(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  };

  private readonly handleVisibility = (): void => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    for (const tickable of this.tickables) tickable.dispose?.();
    this.tickables.clear();
    this.renderer.dispose();
  }
}
