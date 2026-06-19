import { Engine } from './core/Engine';
import { ParticleField } from './scenes/ParticleField';
import { Overlay } from './ui/Overlay';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Required <canvas id="scene"> was not found in the document.');

try {
  const engine = new Engine(canvas);
  engine.add(new ParticleField(engine));
  const overlay = new Overlay();
  engine.start();

  // Fade the hint after a few seconds, or immediately on first interaction.
  const timer = window.setTimeout(() => overlay.fadeOut(), 6000);
  canvas.addEventListener(
    'pointerdown',
    () => {
      window.clearTimeout(timer);
      overlay.fadeOut();
    },
    { once: true },
  );

  // Tear the GL context down on hot reload so dev iterations don't leak.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.clearTimeout(timer);
      engine.dispose();
      overlay.dispose();
    });
  }
} catch (error) {
  // A real capability-detection + fallback UI lands in PR #3; this keeps a hard
  // failure from showing a blank screen in the meantime.
  console.error('[ParticleField] failed to initialise:', error);
  const message = document.createElement('div');
  message.className = 'fatal';
  message.textContent =
    'This experience needs WebGL2, which your browser or device does not appear to support.';
  document.body.appendChild(message);
}
