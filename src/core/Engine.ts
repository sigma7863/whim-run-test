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

type ResizeListener = (width: number, height: number) => void;

/**
 * Minimal, reusable render harness around a single WebGL canvas.
 *
 * Responsibilities kept here so feature code stays focused on *what* to draw:
 *  - renderer / scene / camera lifecycle
 *  - a clamped, delta-timed animation loop
 *  - DPR-capped, observer-driven resize (with listener hooks for post-processing)
 *  - automatic pause when the tab is hidden (saves battery / GPU)
 *  - an optional render step override so a feature can drive an EffectComposer
 *  - deterministic teardown via {@link dispose}
 */
export class Engine {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  private readonly canvas: HTMLCanvasElement;
  private readonly clock = new Clock();
  private readonly tickables = new Set<Tickable>();
  private readonly resizeListeners = new Set<ResizeListener>();
  private readonly maxPixelRatio: number;
  private readonly resizeObserver: ResizeObserver;
  private renderStep: (() => void) | null = null;
  private onContextLostCb: (() => void) | null = null;
  private onContextRestoredCb: (() => void) | null = null;
  private width = 1;
  private height = 1;
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
    canvas.addEventListener('webglcontextlost', this.handleContextLost as EventListener);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored as EventListener);
  }

  /** Register a tickable and return it for fluent assignment. */
  add<T extends Tickable>(tickable: T): T {
    this.tickables.add(tickable);
    return tickable;
  }

  remove(tickable: Tickable): void {
    this.tickables.delete(tickable);
  }

  /**
   * Override the per-frame render call (e.g. to drive an EffectComposer).
   * Pass `null` to restore the default `renderer.render(scene, camera)`.
   */
  setRenderStep(step: (() => void) | null): void {
    this.renderStep = step;
  }

  /** Subscribe to resize events. Fires once immediately with the current size. */
  onResize(listener: ResizeListener): () => void {
    this.resizeListeners.add(listener);
    listener(this.width, this.height);
    return () => {
      this.resizeListeners.delete(listener);
    };
  }

  /** Called when the WebGL context is lost. The loop is already stopped. */
  onContextLost(cb: () => void): void {
    this.onContextLostCb = cb;
  }

  /** Called when a lost WebGL context is restored by the browser. */
  onContextRestored(cb: () => void): void {
    this.onContextRestoredCb = cb;
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
    if (this.renderStep) this.renderStep();
    else this.renderer.render(this.scene, this.camera);
  };

  private readonly handleVisibility = (): void => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault(); // signals we intend to recover, enabling a restore event
    this.stop();
    this.onContextLostCb?.();
  };

  private readonly handleContextRestored = (): void => {
    this.onContextRestoredCb?.();
  };

  private resize(): void {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    for (const listener of this.resizeListeners) listener(this.width, this.height);
  }

  dispose(): void {
    this.stop();
    this.renderStep = null;
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost as EventListener);
    this.canvas.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored as EventListener,
    );
    for (const tickable of this.tickables) tickable.dispose?.();
    this.tickables.clear();
    this.resizeListeners.clear();
    this.renderer.dispose();
  }
}
