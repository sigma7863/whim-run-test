import {
  AmbientLight,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Scene,
} from 'three';
import type { Tickable } from '../core/Engine';

/**
 * Temporary "it renders" scene that proves the {@link Engine} loop, lighting,
 * tone mapping and resize all work. Replaced by the GPGPU particle field in the
 * next milestone.
 */
export class PlaceholderScene implements Tickable {
  private readonly mesh: Mesh<IcosahedronGeometry, MeshStandardMaterial>;
  private readonly objects: Object3D[] = [];

  constructor(private readonly scene: Scene) {
    scene.background = new Color('#05060a');

    const geometry = new IcosahedronGeometry(1.6, 1);
    const material = new MeshStandardMaterial({
      color: new Color('#5b8cff'),
      roughness: 0.35,
      metalness: 0.4,
      flatShading: true,
    });
    this.mesh = new Mesh(geometry, material);

    const key = new DirectionalLight('#ffffff', 3);
    key.position.set(4, 6, 5);
    const rim = new DirectionalLight('#7aa2ff', 2);
    rim.position.set(-5, -2, -4);
    const ambient = new AmbientLight('#2a3550', 1);

    this.objects.push(this.mesh, key, rim, ambient);
    for (const object of this.objects) scene.add(object);
  }

  update(dt: number): void {
    this.mesh.rotation.x += dt * 0.3;
    this.mesh.rotation.y += dt * 0.45;
  }

  dispose(): void {
    for (const object of this.objects) this.scene.remove(object);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
