import type { WebGLRenderer } from 'three';
import type { Tickable } from '../core/Engine';

/**
 * Tiny developer HUD reading `renderer.info`: FPS, frame time, draw calls, and
 * GPU resource counts. Hidden by default; toggle with the backtick (`) key, or
 * start visible via the `?stats` query param. Implements {@link Tickable} so the
 * engine drives its sampling.
 */
export class StatsPanel implements Tickable {
  private readonly root: HTMLDivElement;
  private visible: boolean;
  private frames = 0;
  private accum = 0;
  private fps = 0;

  constructor(
    private readonly renderer: WebGLRenderer,
    startVisible = false,
  ) {
    this.visible = startVisible;
    this.root = document.createElement('div');
    this.root.className = 'stats';
    this.root.hidden = !this.visible;
    document.body.appendChild(this.root);
    window.addEventListener('keydown', this.onKey);
  }

  update(dt: number): void {
    this.frames += 1;
    this.accum += dt;
    if (this.accum >= 0.5) {
      this.fps = this.frames / this.accum;
      this.frames = 0;
      this.accum = 0;
      if (this.visible) this.render();
    }
  }

  private render(): void {
    const { render, memory } = this.renderer.info;
    const ms = (1000 / Math.max(this.fps, 0.001)).toFixed(1);
    this.root.textContent =
      `${this.fps.toFixed(0)} fps · ${ms} ms\n` +
      `draw calls: ${render.calls}\n` +
      `geometries: ${memory.geometries} · textures: ${memory.textures}`;
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Backquote') return;
    this.visible = !this.visible;
    this.root.hidden = !this.visible;
    if (this.visible) this.render();
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
