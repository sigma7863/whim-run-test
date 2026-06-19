import { curlNoise } from './curlNoise.glsl';

/**
 * Velocity integration pass for the GPGPU simulation.
 *
 * `texturePosition`, `textureVelocity` and `resolution` are injected
 * automatically by GPUComputationRenderer, so they are not declared here.
 */
export const velocityFragment = /* glsl */ `
uniform float uTime;
uniform float uDelta;
uniform vec3 uPointer;
uniform float uPointerActive;
uniform float uPointerStrength;
uniform float uPointerRadius;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uHomeStrength;
uniform float uDamping;
uniform float uMaxSpeed;
uniform sampler2D textureDefaultPosition;

${curlNoise}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 vel = velData.xyz;
  vec3 home = texture2D(textureDefaultPosition, uv).xyz;

  vec3 force = vec3(0.0);

  // Divergence-free curl-noise flow → organic, swirling motion.
  force += curlNoise(pos * uCurlScale + vec3(0.0, 0.0, uTime * 0.05)) * uCurlStrength;

  // Soft spring back to the home shape keeps the cloud cohesive.
  force += (home - pos) * uHomeStrength;

  // Pointer interaction: attract + orbit, or scatter when the strength is negative.
  vec3 toPointer = uPointer - pos;
  float dist = length(toPointer);
  float influence = uPointerActive * smoothstep(uPointerRadius, 0.0, dist);
  vec3 dir = toPointer / max(dist, 1e-4);
  vec3 swirl = cross(dir, vec3(0.0, 0.0, 1.0));
  force += (dir * uPointerStrength + swirl * abs(uPointerStrength) * 1.4) * influence;

  vel += force * uDelta;
  // Frame-rate-independent exponential damping toward a steady state.
  vel *= exp(-uDamping * uDelta);

  float speed = length(vel);
  if (speed > uMaxSpeed) vel = vel / speed * uMaxSpeed;

  gl_FragColor = vec4(vel, velData.w);
}
`;
