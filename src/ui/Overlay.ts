/**
 * Minimal title/hint overlay. Non-interactive (pointer-events: none) so it never
 * intercepts canvas input; fades out via {@link fadeOut}.
 */
export class Overlay {
  private readonly root: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'overlay';

    const title = document.createElement('h1');
    title.textContent = 'Particle Field';

    const hint = document.createElement('p');
    hint.textContent = 'Move to disturb · press to scatter';

    this.root.append(title, hint);
    document.body.appendChild(this.root);
  }

  fadeOut(): void {
    this.root.classList.add('overlay--hidden');
  }

  dispose(): void {
    this.root.remove();
  }
}
