import { prefersReducedMotion, supportsWebGL2 } from './core/capabilities';
import { Engine } from './core/Engine';
import { installObservability } from './core/observability';
import { ParticleField } from './scenes/ParticleField';
import { showFallback } from './ui/Fallback';
import { Overlay } from './ui/Overlay';
import { StatsPanel } from './ui/StatsPanel';
import './style.css';

// Wire error/perf reporting before anything else so early failures are caught.
installObservability();

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Required <canvas id="scene"> was not found in the document.');

// Capability gate: a clear message beats a blank canvas on unsupported devices.
if (!supportsWebGL2()) {
  showFallback({
    title: 'WebGL2 not available',
    message:
      'This particle experience needs WebGL2, which your browser or device does not appear to support. Try a current version of Chrome, Edge, Firefox, or Safari.',
  });
} else {
  try {
    const engine = new Engine(canvas);
    engine.add(new ParticleField(engine, { reducedMotion: prefersReducedMotion() }));
    // Developer HUD: hidden unless `?stats` is set; toggle live with backtick (`).
    const showStats = new URLSearchParams(window.location.search).has('stats');
    engine.add(new StatsPanel(engine.renderer, showStats));
    const overlay = new Overlay();
    engine.start();

    // If the GPU context is lost, the loop is already stopped; offer a reload.
    let contextLostPanel: HTMLElement | null = null;
    engine.onContextLost(() => {
      contextLostPanel ??= showFallback({
        title: 'Graphics paused',
        message: 'The graphics context was lost (this can happen after the GPU resets or sleeps).',
        showReload: true,
      });
    });

    // Fade the hint after a few seconds, or immediately on first interaction.
    const timer = window.setTimeout(() => overlay.fadeOut(), 6000);
    const dismiss = (): void => {
      window.clearTimeout(timer);
      overlay.fadeOut();
    };
    canvas.addEventListener('pointerdown', dismiss, { once: true });
    canvas.addEventListener('keydown', dismiss, { once: true });

    // Tear the GL context down on hot reload so dev iterations don't leak.
    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        window.clearTimeout(timer);
        engine.dispose();
        overlay.dispose();
        contextLostPanel?.remove();
      });
    }
  } catch (error) {
    console.error('[ParticleField] failed to initialise:', error);
    showFallback({
      title: 'Could not start',
      message: 'Something went wrong initialising the WebGL renderer on this device.',
    });
  }
}
