import { Vector2 } from 'three';

/**
 * Tracks pointer position (as normalized device coordinates) plus hover/press
 * state across mouse and touch via the unified Pointer Events API. Cleans up
 * its own listeners on {@link dispose}.
 */
export class PointerTracker {
  /** Pointer position in NDC space: x,y each in [-1, 1], y up. */
  readonly ndc = new Vector2();
  over = false;
  down = false;

  constructor(private readonly element: HTMLElement) {
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointerenter', this.onEnter);
    element.addEventListener('pointerleave', this.onLeave);
    // Release can happen anywhere; listen on window so we never get stuck "down".
    window.addEventListener('pointerup', this.onUp);
  }

  private readonly onMove = (event: PointerEvent): void => {
    const rect = this.element.getBoundingClientRect();
    this.ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    this.over = true;
  };

  private readonly onDown = (event: PointerEvent): void => {
    this.down = true;
    this.over = true;
    this.onMove(event);
  };

  private readonly onUp = (): void => {
    this.down = false;
  };

  private readonly onEnter = (): void => {
    this.over = true;
  };

  private readonly onLeave = (): void => {
    this.over = false;
    this.down = false;
  };

  dispose(): void {
    this.element.removeEventListener('pointermove', this.onMove);
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointerenter', this.onEnter);
    this.element.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('pointerup', this.onUp);
  }
}
