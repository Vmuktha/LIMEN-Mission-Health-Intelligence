/**
 * Deterministic scene geometry for the LIMEN signature scene.
 *
 * Everything here is pure and seeded, so the composition is identical on every
 * load and never depends on `Math.random` during a build or a prerender.
 *
 * The geometry is environment art in the Orbit and Signal registers: a limb,
 * a particle field, and filament traces. It carries no measurement and no
 * participant state.
 */

export interface SceneVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Reads the LIMEN palette from the document's custom properties, so the scene
 * is single-sourced with the interface and can never drift from the tokens.
 */
export function readScenePalette(): {
  readonly void: string;
  readonly hull: string;
  readonly hullRaised: string;
  readonly ion: string;
  readonly ionSoft: string;
  readonly plasma: string;
  readonly plasmaBright: string;
  readonly earthNight: string;
  readonly cloud: string;
} {
  const styles = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles?.getPropertyValue(name).trim() || fallback;
  return {
    void: read("--limen-void", "#05070f"),
    hull: read("--limen-hull", "#0b101c"),
    hullRaised: read("--limen-hull-raised", "#141b2b"),
    ion: read("--limen-ion", "#22d3ee"),
    ionSoft: read("--limen-ion-soft", "#67e8f9"),
    plasma: read("--limen-plasma", "#a78bfa"),
    plasmaBright: read("--limen-plasma-bright", "#e879f9"),
    earthNight: read("--limen-earth-night", "#152132"),
    cloud: read("--limen-cloud", "#c7e0f5"),
  };
}

export const PLANET = {
  centre: { x: 2.15, y: 0.18, z: -0.55 } as SceneVector3,
  radius: 2.05,
} as const;

/** A small, fast, seeded generator: identical geometry on every load. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function add(a: SceneVector3, b: SceneVector3): SceneVector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(vector: SceneVector3, factor: number): SceneVector3 {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

function normalize(vector: SceneVector3): SceneVector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export interface FilamentCurve {
  /** Control points in world space, ordered from the limb outwards. */
  readonly points: readonly SceneVector3[];
  readonly radius: number;
  /** Only a minority of filaments carry a travelling signal. */
  readonly pulse: boolean;
  readonly speed: number;
  readonly phase: number;
}

/**
 * Grows a fan of filaments out of the planetary limb. Each filament leaves the
 * surface along the local normal, then bends away from the body so the traces
 * read as pathways rather than spikes.
 */
export function buildFilamentCurves(options: {
  readonly count: number;
  readonly seed: number;
  readonly minAngle: number;
  readonly maxAngle: number;
  readonly length: number;
  readonly radius: number;
}): readonly FilamentCurve[] {
  const random = mulberry32(options.seed);
  const curves: FilamentCurve[] = [];

  for (let index = 0; index < options.count; index += 1) {
    const t = options.count === 1 ? 0 : index / (options.count - 1);
    const angle = options.minAngle + (options.maxAngle - options.minAngle) * t + (random() - 0.5) * 0.08;
    const depth = (random() - 0.5) * 2.4;
    const normal = normalize({ x: Math.cos(angle), y: Math.sin(angle), z: depth * 0.22 });
    const origin = add(PLANET.centre, scale(normal, PLANET.radius * 0.995));

    const spread = (random() - 0.5) * 0.55;
    const growth = normalize({
      x: normal.x * Math.cos(spread) - normal.y * Math.sin(spread),
      y: normal.x * Math.sin(spread) + normal.y * Math.cos(spread),
      z: normal.z + (random() - 0.5) * 0.25,
    });
    const lateral = normalize({ x: -growth.y, y: growth.x, z: (random() - 0.5) * 0.4 });
    const lift = { x: 0, y: 0.55 + random() * 0.8, z: (random() - 0.5) * 0.3 };
    const reach = options.length * (0.7 + random() * 0.7);
    const drift = (random() - 0.5) * 0.9;

    curves.push({
      points: [
        origin,
        add(add(origin, scale(growth, reach * 0.22)), scale(lateral, drift * 0.2)),
        add(add(add(origin, scale(growth, reach * 0.52)), scale(lift, 0.45)), scale(lateral, drift * 0.5)),
        add(add(add(origin, scale(growth, reach * 0.82)), scale(lift, 0.85)), scale(lateral, drift * 0.85)),
        add(add(add(origin, scale(growth, reach)), scale(lift, 1.15)), scale(lateral, drift)),
      ],
      radius: options.radius * (0.7 + random() * 0.7),
      pulse: index % 4 === 1,
      speed: 0.16 + random() * 0.16,
      phase: random(),
    });
  }

  return curves;
}

export interface ParticleSpec {
  readonly positions: Float32Array;
  readonly scales: Float32Array;
  readonly phases: Float32Array;
}

/**
 * Distributes the deep-space field over a wide volume, thinning it near the
 * camera and behind the planet so the composition keeps its negative space.
 */
export function buildParticleField(options: {
  readonly count: number;
  readonly seed: number;
  readonly bounds: { readonly x: number; readonly y: number; readonly z: number };
}): ParticleSpec {
  const random = mulberry32(options.seed);
  const positions = new Float32Array(options.count * 3);
  const scales = new Float32Array(options.count);
  const phases = new Float32Array(options.count);

  for (let index = 0; index < options.count; index += 1) {
    const offset = index * 3;
    positions[offset] = (random() - 0.5) * options.bounds.x * 2;
    positions[offset + 1] = (random() - 0.5) * options.bounds.y * 2;
    positions[offset + 2] = options.bounds.z * 0.5 - random() * options.bounds.z;
    scales[index] = 0.35 + random() * 1.15;
    phases[index] = random() * Math.PI * 2;
  }

  return { positions, scales, phases };
}

export interface NodeSpec {
  readonly position: SceneVector3;
  readonly size: number;
  readonly tone: "ion" | "plasma";
}

/** Luminous nodes placed where filaments fork or fade out. */
export function buildNodes(curves: readonly FilamentCurve[], count: number, seed: number): readonly NodeSpec[] {
  const random = mulberry32(seed);
  const nodes: NodeSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const curve = curves[Math.floor(random() * curves.length)];
    if (!curve) continue;
    const point = curve.points[curve.points.length - 1];
    nodes.push({
      position: { x: point.x + (random() - 0.5) * 0.12, y: point.y + (random() - 0.5) * 0.12, z: point.z + (random() - 0.5) * 0.12 },
      size: 0.022 + random() * 0.03,
      tone: random() > 0.62 ? "plasma" : "ion",
    });
  }
  return nodes;
}

/** Picks a safe particle budget for the device the visitor is using. */
export function resolveSceneQuality(): { readonly particles: number; readonly maxPixelRatio: number; readonly filaments: number } {
  const cores = typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency ?? 8;
  const memory = typeof navigator === "undefined" ? 8 : (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  if (cores <= 4 || memory <= 4) return { particles: 3200, maxPixelRatio: 1.25, filaments: 9 };
  if (coarse) return { particles: 5200, maxPixelRatio: 1.5, filaments: 12 };
  return { particles: 9000, maxPixelRatio: 1.75, filaments: 14 };
}
