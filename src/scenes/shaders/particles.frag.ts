/**
 * Particle fragment shader. Draws a soft round sprite and tints it from a cool
 * "slow" color to a hot "fast" color by speed. Output is linear; tone mapping
 * and sRGB encoding are applied downstream by the OutputPass.
 */
export const particlesFragment = /* glsl */ `
uniform vec3 uColorSlow;
uniform vec3 uColorFast;
uniform float uOpacity;

varying float vSpeed;
varying float vSeed;

void main() {
  vec2 offset = gl_PointCoord - 0.5;
  float d2 = dot(offset, offset);
  if (d2 > 0.25) discard;

  float alpha = smoothstep(0.25, 0.0, d2);
  vec3 color = mix(uColorSlow, uColorFast, clamp(vSpeed * 0.35, 0.0, 1.0));
  color *= 0.85 + vSeed * 0.25;

  gl_FragColor = vec4(color, alpha * uOpacity);
}
`;
