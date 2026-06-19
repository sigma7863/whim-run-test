/**
 * Position integration pass: advance each particle by its velocity.
 * `texturePosition`, `textureVelocity` and `resolution` are injected by
 * GPUComputationRenderer.
 */
export const positionFragment = /* glsl */ `
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  pos.xyz += vel * uDelta;
  gl_FragColor = pos;
}
`;
