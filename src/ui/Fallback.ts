export interface FallbackOptions {
  title: string;
  message: string;
  /** Show a reload button (used for recoverable failures like context loss). */
  showReload?: boolean;
}

/**
 * Renders a centered, accessible message panel in place of the experience.
 * Used when WebGL2 is unavailable or the GL context is lost. Returns the root
 * element so callers can remove it (e.g. on context restore).
 */
export function showFallback({ title, message, showReload = false }: FallbackOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'fallback';
  root.setAttribute('role', 'alert');

  const heading = document.createElement('h1');
  heading.textContent = title;

  const paragraph = document.createElement('p');
  paragraph.textContent = message;

  root.append(heading, paragraph);

  if (showReload) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fallback__reload';
    button.textContent = 'Reload';
    button.addEventListener('click', () => window.location.reload());
    root.append(button);
  }

  document.body.appendChild(root);
  return root;
}
