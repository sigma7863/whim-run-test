/**
 * Particle vertex shader. Reads each particle's simulated position/velocity from
 * the GPGPU data textures (indexed by the per-vertex `reference` uv) and sizes
 * the point with perspective falloff.
 */
export const particlesVertex = /* glsl */ `
uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float uSize;
uniform float uScale;

attribute vec2 reference;
attribute float aScale;

varying float vSpeed;
varying float vSeed;

void main() {
  vec3 pos = texture2D(texturePosition, reference).xyz;
  vec3 vel = texture2D(textureVelocity, reference).xyz;

  vSpeed = length(vel);
  vSeed = aScale;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Perspective-correct point size, clamped to a sane pixel range.
  gl_PointSize = clamp(uSize * aScale * (uScale / -mvPosition.z), 0.5, 4.0);
}
`;
