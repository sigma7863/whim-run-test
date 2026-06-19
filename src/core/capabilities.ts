/** Runtime capability / preference checks used to gate the experience. */

/** True if the browser can create a WebGL2 context (required by the GPGPU sim). */
export function supportsWebGL2(): boolean {
  if (typeof window === 'undefined' || !('WebGL2RenderingContext' in window)) return false;
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

/** True if the user has asked the OS to minimize non-essential motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
