/**
 * Shader sources for the LIMEN signature scene.
 *
 * All materials are custom and unlit: the scene carries its own light model,
 * so no light objects are created and no shadow or environment work happens.
 * Every colour is taken from the LIMEN token palette.
 */

export const PLANET_VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const PLANET_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uLightDirection;
  uniform vec3 uVoid;
  uniform vec3 uHull;
  uniform vec3 uIon;
  uniform vec3 uPlasma;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 view = normalize(-vViewPosition);

    float lambert = max(dot(normal, normalize(uLightDirection)), 0.0);
    float terminator = smoothstep(0.0, 0.9, lambert);
    float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.7);

    vec3 body = mix(uVoid, uHull, terminator * 0.5);
    vec3 atmosphere = mix(uPlasma, uIon, smoothstep(-0.35, 0.75, normal.y));
    vec3 colour = body + atmosphere * fresnel * 0.72;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float aScale;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = -viewPosition.z;
    float twinkle = 0.62 + 0.38 * sin(uTime * 0.42 + aPhase);
    gl_PointSize = aScale * uPixelRatio * (34.0 / max(depth, 0.6));
    vAlpha = twinkle * smoothstep(46.0, 8.0, depth) * smoothstep(0.4, 2.4, depth);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uIon;

  varying float vAlpha;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    if (radius > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, radius);
    gl_FragColor = vec4(uIon, glow * glow * vAlpha * 0.85);
  }
`;

export const FILAMENT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vFilamentUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vFilamentUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const FILAMENT_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uIon;
  uniform vec3 uPlasma;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPhase;
  uniform float uPulse;

  varying vec2 vFilamentUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    float along = fract(vFilamentUv.x - uTime * uSpeed + uPhase);
    float pulse = pow(1.0 - along, 26.0) * uPulse;

    vec3 base = mix(uIon, uPlasma, vFilamentUv.x);
    float fresnel = pow(1.0 - abs(dot(normalize(vViewPosition), normalize(vViewNormal))), 1.7);

    vec3 colour = base * (0.18 + 0.42 * fresnel) + vec3(0.55, 0.86, 1.0) * pulse * 0.55;
    float alpha = 0.26 + 0.34 * fresnel + pulse * 0.45;

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.95));
  }
`;
