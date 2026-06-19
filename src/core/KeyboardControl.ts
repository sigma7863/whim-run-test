import { MathUtils, Vector2 } from 'three';

const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
const SCATTER_KEYS = new Set(['Space']);

/**
 * Keyboard equivalent of the pointer, for operability without a mouse/touch.
 * Arrow keys / WASD move a virtual attractor (in NDC space); Space scatters.
 * Listens on a focusable target (the canvas) and cleans up on {@link dispose}.
 */
export class KeyboardControl {
  /** Virtual attractor position in NDC: x,y each in [-1, 1]. */
  readonly ndc = new Vector2();
  active = false;
  scatter = false;

  private readonly held = new Set<string>();

  constructor(private readonly target: HTMLElement) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  /** Integrate held keys into the virtual pointer. Call once per frame. */
  update(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.held.has('ArrowLeft') || this.held.has('KeyA')) dx -= 1;
    if (this.held.has('ArrowRight') || this.held.has('KeyD')) dx += 1;
    if (this.held.has('ArrowUp') || this.held.has('KeyW')) dy += 1;
    if (this.held.has('ArrowDown') || this.held.has('KeyS')) dy -= 1;

    if (dx !== 0 || dy !== 0) {
      const speed = 1.2 * dt;
      this.ndc.x = MathUtils.clamp(this.ndc.x + dx * speed, -1, 1);
      this.ndc.y = MathUtils.clamp(this.ndc.y + dy * speed, -1, 1);
    }

    this.scatter = this.held.has('Space');
    this.active = this.held.size > 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!MOVE_KEYS.has(event.code) && !SCATTER_KEYS.has(event.code)) return;
    event.preventDefault(); // stop arrow/space from scrolling the page
    this.held.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
    this.active = false;
    this.scatter = false;
  };

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
