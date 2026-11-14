/**
 * Shader sources for the LIMEN signature scene.
 *
 * All materials are custom and unlit: the scene carries its own light model,
 * so no light objects are created and no shadow or environment work happens.
 * Every colour is taken from the LIMEN token palette.
 */

export const PLANET_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const PLANET_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uSurfaceMap;
  uniform vec3 uLightDirection;
  uniform vec3 uNightSide;
  uniform vec3 uAtmosphere;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vViewNormal);
    vec3 view = normalize(-vViewPosition);
    float sunlight = dot(normal, normalize(uLightDirection));
    float day = smoothstep(-0.16, 0.22, sunlight);
    vec3 surface = texture2D(uSurfaceMap, vUv).rgb;
    vec3 colour = mix(surface * uNightSide, surface * (0.86 + 0.14 * max(sunlight, 0.0)), day);
    float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.4);
    colour += uAtmosphere * fresnel * (0.16 + 0.24 * day);
    gl_FragColor = vec4(colour, 1.0);
  }
`;

export const CLOUD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const CLOUD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uLightDirection;
  uniform vec3 uCloudColor;
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    float cloud = smoothstep(0.32, 0.78, texture2D(uCloudMap, vUv).r);
    float sunlight = max(dot(normalize(vViewNormal), normalize(uLightDirection)), 0.0);
    float alpha = cloud * (0.08 + 0.34 * smoothstep(0.0, 0.22, sunlight));
    gl_FragColor = vec4(uCloudColor, alpha);
  }
`;

export const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uAtmosphere;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    float rim = pow(1.0 - clamp(dot(normalize(vViewNormal), normalize(-vViewPosition)), 0.0, 1.0), 3.2);
    gl_FragColor = vec4(uAtmosphere, rim * 0.7);
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
