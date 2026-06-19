import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Plane,
  Points,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { DataTexture, PerspectiveCamera, WebGLRenderer } from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Engine, Tickable } from '../core/Engine';
import { PointerTracker } from '../core/PointerTracker';
import { KeyboardControl } from '../core/KeyboardControl';
import { velocityFragment } from './shaders/velocity.frag';
import { positionFragment } from './shaders/position.frag';
import { particlesVertex } from './shaders/particles.vert';
import { particlesFragment } from './shaders/particles.frag';

/** 708² ≈ 501k particles. The single biggest perf lever; PR #3 makes it adaptive. */
const TEXTURE_SIZE = 708;
const SPHERE_RADIUS = 3.2;
const ATTRACT_STRENGTH = 10;
const SCATTER_STRENGTH = -24;

export interface ParticleFieldOptions {
  /** Calm the motion for users who prefer reduced motion (no camera drift). */
  reducedMotion?: boolean;
}

/**
 * The centerpiece: ~500k particles simulated entirely on the GPU.
 *
 * Two data textures (position + velocity) are ping-ponged each frame by
 * {@link GPUComputationRenderer}. A divergence-free curl-noise field drives the
 * flow, a soft spring holds the cloud to a sphere, and the pointer (or keyboard)
 * attracts / scatters particles. The point cloud is rendered additively and
 * finished with UnrealBloom + ACES tone mapping for a cinematic look.
 */
export class ParticleField implements Tickable {
  private readonly renderer: WebGLRenderer;
  private readonly camera: PerspectiveCamera;
  private readonly reducedMotion: boolean;

  private readonly gpu: GPUComputationRenderer;
  private readonly positionVariable: ReturnType<GPUComputationRenderer['addVariable']>;
  private readonly velocityVariable: ReturnType<GPUComputationRenderer['addVariable']>;

  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly points: Points;

  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  private readonly pointer: PointerTracker;
  private readonly keyboard: KeyboardControl;
  private readonly raycaster = new Raycaster();
  private readonly plane = new Plane(new Vector3(0, 0, 1), 0);
  private readonly pointerWorld = new Vector3();
  private readonly cameraTarget = new Vector3();
  private readonly activeNdc = new Vector2();
  private readonly unsubscribeResize: () => void;

  private pointerInfluence = 0;

  constructor(
    private readonly engine: Engine,
    options: ParticleFieldOptions = {},
  ) {
    this.renderer = engine.renderer;
    this.camera = engine.camera;
    this.reducedMotion = options.reducedMotion ?? false;
    engine.scene.background = new Color('#04050a');

    // --- GPGPU simulation -------------------------------------------------
    this.gpu = new GPUComputationRenderer(TEXTURE_SIZE, TEXTURE_SIZE, this.renderer);
    const position0 = this.gpu.createTexture();
    const velocity0 = this.gpu.createTexture();
    this.seed(position0, velocity0);

    this.positionVariable = this.gpu.addVariable('texturePosition', positionFragment, position0);
    this.velocityVariable = this.gpu.addVariable('textureVelocity', velocityFragment, velocity0);
    this.gpu.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);
    this.gpu.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);

    // Calmer flow under reduced-motion: weaker turbulence, lower top speed.
    const curlStrength = this.reducedMotion ? 0.9 : 2.4;
    const maxSpeed = this.reducedMotion ? 3 : 6;

    Object.assign(this.velocityVariable.material.uniforms, {
      uTime: { value: 0 },
      uDelta: { value: 0 },
      uPointer: { value: new Vector3() },
      uPointerActive: { value: 0 },
      uPointerStrength: { value: ATTRACT_STRENGTH },
      uPointerRadius: { value: 2.2 },
      uCurlScale: { value: 0.35 },
      uCurlStrength: { value: curlStrength },
      uHomeStrength: { value: 1.8 },
      uDamping: { value: 1.2 },
      uMaxSpeed: { value: maxSpeed },
      textureDefaultPosition: { value: position0 },
    });
    this.positionVariable.material.uniforms.uDelta = { value: 0 };

    const error = this.gpu.init();
    if (error !== null) throw new Error(`GPUComputationRenderer init failed: ${error}`);

    // --- point cloud ------------------------------------------------------
    this.geometry = this.buildGeometry();
    this.material = new ShaderMaterial({
      uniforms: {
        texturePosition: { value: null },
        textureVelocity: { value: null },
        uSize: { value: 0.016 },
        uScale: { value: 1 },
        uColorSlow: { value: new Color(0.08, 0.16, 0.55) },
        uColorFast: { value: new Color(0.55, 0.95, 1.0) },
        // Low per-particle opacity: ~500k additive sprites accumulate fast, so
        // each contributes only a little and dense regions glow rather than clip.
        uOpacity: { value: 0.08 },
      },
      vertexShader: particlesVertex,
      fragmentShader: particlesFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false; // positions live on the GPU; never cull
    engine.scene.add(this.points);

    // --- post-processing (bloom) -----------------------------------------
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(engine.scene, this.camera));
    // (resolution, strength, radius, threshold). Threshold > 0 so only the
    // brightest accumulations bloom — keeps the glow controlled, not a whiteout.
    this.bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.7, 0.5, 0.35);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // --- input + engine wiring -------------------------------------------
    this.pointer = new PointerTracker(this.renderer.domElement);
    this.keyboard = new KeyboardControl(this.renderer.domElement);
    if (this.reducedMotion) this.camera.position.set(0, 0, 7);
    engine.setRenderStep(() => this.composer.render());
    this.unsubscribeResize = engine.onResize((w, h) => this.handleResize(w, h));
  }

  update(dt: number, elapsed: number): void {
    const uniforms = this.velocityVariable.material.uniforms;
    uniforms.uTime.value = elapsed;
    uniforms.uDelta.value = dt;
    this.positionVariable.material.uniforms.uDelta.value = dt;

    // Merge pointer + keyboard into a single virtual attractor.
    this.keyboard.update(dt);
    const keyboardActive = this.keyboard.active && !this.pointer.over;
    const over = this.pointer.over || this.keyboard.active;
    const down = this.pointer.down || this.keyboard.scatter;
    this.activeNdc.copy(keyboardActive ? this.keyboard.ndc : this.pointer.ndc);

    // Smoothly ramp influence in/out; scatter (negative) while pressed.
    const target = over ? 1 : 0;
    this.pointerInfluence += (target - this.pointerInfluence) * Math.min(1, dt * 6);
    uniforms.uPointerActive.value = this.pointerInfluence;
    uniforms.uPointerStrength.value = down ? SCATTER_STRENGTH : ATTRACT_STRENGTH;
    this.updatePointerWorld();
    (uniforms.uPointer.value as Vector3).copy(this.pointerWorld);

    this.gpu.compute();
    this.material.uniforms.texturePosition.value = this.gpu.getCurrentRenderTarget(
      this.positionVariable,
    ).texture;
    this.material.uniforms.textureVelocity.value = this.gpu.getCurrentRenderTarget(
      this.velocityVariable,
    ).texture;

    if (!this.reducedMotion) this.driftCamera(dt, elapsed);
  }

  dispose(): void {
    this.unsubscribeResize();
    this.engine.setRenderStep(null);
    this.pointer.dispose();
    this.keyboard.dispose();
    this.engine.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.gpu.dispose();
    this.composer.dispose();
  }

  /** Seed positions on a Fibonacci sphere shell; velocities start at rest. */
  private seed(position: DataTexture, velocity: DataTexture): void {
    const pos = position.image.data as Float32Array;
    const vel = velocity.image.data as Float32Array;
    const count = TEXTURE_SIZE * TEXTURE_SIZE;
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const inclination = Math.acos(1 - (2 * (i + 0.5)) / count);
      const azimuth = golden * i;
      const radius = SPHERE_RADIUS * (0.78 + Math.random() * 0.22);
      const sinI = Math.sin(inclination);
      const k = i * 4;
      pos[k] = radius * sinI * Math.cos(azimuth);
      pos[k + 1] = radius * sinI * Math.sin(azimuth);
      pos[k + 2] = radius * Math.cos(inclination);
      pos[k + 3] = Math.random();
      vel[k] = 0;
      vel[k + 1] = 0;
      vel[k + 2] = 0;
      vel[k + 3] = Math.random();
    }
  }

  /** One vertex per particle; `reference` maps it to a data-texture texel center. */
  private buildGeometry(): BufferGeometry {
    const count = TEXTURE_SIZE * TEXTURE_SIZE;
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const references = new Float32Array(count * 2);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      references[i * 2] = ((i % TEXTURE_SIZE) + 0.5) / TEXTURE_SIZE;
      references[i * 2 + 1] = (Math.floor(i / TEXTURE_SIZE) + 0.5) / TEXTURE_SIZE;
      scales[i] = 0.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('reference', new BufferAttribute(references, 2));
    geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
    return geometry;
  }

  private updatePointerWorld(): void {
    this.raycaster.setFromCamera(this.activeNdc, this.camera);
    // Leaves pointerWorld unchanged if the ray is parallel to the plane.
    this.raycaster.ray.intersectPlane(this.plane, this.pointerWorld);
  }

  private driftCamera(dt: number, elapsed: number): void {
    const t = elapsed * 0.06;
    this.cameraTarget.set(
      Math.sin(t) * 1.4 + this.activeNdc.x * 0.9,
      Math.cos(t * 0.8) * 0.9 + this.activeNdc.y * 0.6,
      6.2 + Math.sin(t * 0.5) * 0.6,
    );
    this.camera.position.lerp(this.cameraTarget, 1 - Math.exp(-dt * 1.5));
    this.camera.lookAt(0, 0, 0);
  }

  private handleResize(width: number, height: number): void {
    const dpr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    this.material.uniforms.uScale.value = height * dpr;
  }
}
