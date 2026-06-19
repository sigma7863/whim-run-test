import { Engine } from './core/Engine';
import { PlaceholderScene } from './scenes/PlaceholderScene';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Required <canvas id="scene"> was not found in the document.');

const engine = new Engine(canvas);
engine.add(new PlaceholderScene(engine.scene));
engine.start();

// Tear the GL context down on hot reload so dev iterations don't leak contexts.
if (import.meta.hot) {
  import.meta.hot.dispose(() => engine.dispose());
}
