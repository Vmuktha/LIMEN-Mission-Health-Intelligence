# LIMEN visual charter

This charter governs how LIMEN may look, move and sound. It is binding on every future phase, including the cinematic 3D work planned for later in Phase 8A.

Its purpose is simple: LIMEN is a scientific instrument about human sensorimotor behaviour. The interface may be beautiful, atmospheric and immersive — but it may never imply a measurement that was not made, a signal that was not recorded, a person who is not here, or a conclusion that the research does not support.

## The three registers

Every visual element belongs to exactly one register, and the register determines what the element is allowed to mean.

### Orbit

The altered-gravity environment the research concerns: deep space, orbital horizons, atmospheric depth, the limb light of a planet.

- **May appear in**: ambient backgrounds, page transitions, hero imagery, non-interactive environment layers.
- **Must never**: carry a value, a status, a threshold, or a claim.
- **Constraint**: Orbit is context. It is never the subject of the screen.

### Signal

The neural and physiological register: colourful neural fibres, signal pathways, synaptic pulses, axon-like filaments.

- **May appear in**: environment art, section transitions, non-semantic decorative structure.
- **Must never**: be attached to a measured value, a metric, a chart point, a participant state, or a recovery phase.
- **Constraint**: a fibre that pulses is not a neural signal. LIMEN measures pointer behaviour. Nothing in LIMEN is a neural measurement, and no visual may suggest otherwise.

### Instrument

The readout surface where every number, label, unit, timestamp and explanation lives.

- **May appear in**: panels, tables, charts, forms, badges, notices, navigation, all numeric surfaces.
- **Must**: be legible, quiet, exact, and free of decoration that competes with the data.
- **Constraint**: when the Orbit and Signal registers are present, the Instrument register is always the most legible thing on the screen.

## Visual identity principles

1. **Depth through light, not through effects.** Atmospheric perspective, rim light, a low horizon and a vignette establish depth. Heavy bloom, lens flare, depth of field over data and motion blur do not.
2. **Restraint is the luxury.** Large negative space, few elements, high contrast. The cinematic register is carried by lighting and scale, not by decoration.
3. **Instrument-grade typography.** Numbers, identifiers, protocol labels and timestamps are monospaced and tabular. A value must be readable without interpretation.
4. **Honest state.** Unavailable is inert and desaturated. Legacy and protocol mismatch are amber. Errors are red. Glow is reserved for live, valid, current data. Nothing absent is ever rendered as zero or as a placeholder that could be mistaken for a measurement.
5. **Provenance lives in the frame.** "Research prototype", "browser-local profile" and "descriptive only" are visible parts of the chrome, not a footnote.

## Lighting model

Three light sources, and only three:

- **Key** — cool white-blue, upper left. Defines the active element and the target surface.
- **Fill** — deep indigo ambient. Establishes the environment without drawing attention.
- **Rim** — ion cyan. Separates the cursor and trail from the field and gives edges definition.

Additional rules:

- A target is lit by the key light; it does not glow to appear important.
- One bloom pass at most, applied to emissive scene elements only — never to text, numbers, chart strokes or table content.
- Data surfaces live outside the tone-mapped render. Colour management in the 3D pipeline must never shift the colour of a number.

## Material language

- **Glass is for chrome only** — topbar, overlay, HUD. Backdrop blur with a one-pixel ion-tinted border and at most 8% white fill.
- **Panels are opaque** surfaces with a one-pixel inner top highlight. Stacked glass panels are prohibited.
- **Texture** is limited to a hairline grid, fine noise and a vignette.
- **Prohibited**: neumorphism, glossy buttons, drop shadows under 24px blur, decorative geometry used as filler.

## Motion principles

- Three durations (120 / 240 / 480ms) and two easings. Nothing else.
- One dominant move per transition.
- Motion is choreography, not decoration, and never a carrier of information.
- Interactive latency budget: pointer-driven elements respond within one frame. The task canvas is never gated on a render loop.
- `prefers-reduced-motion: reduce` is a first-class path, not a fallback: the scene becomes a static composition, camera drift and pulses stop, and transitions collapse to short opacity fades.

## Between Worlds

The identity is *between worlds*: a research instrument standing in an orbital environment, lit from two directions. Two light domains — the cool ion of Orbit and the violet of Signal — meet along a soft seam, and the instrument's reading surface sits between them.

- The **frame** is where the environment lives: the header, the navigation rail, the horizon limb and the orbital rings.
- The **reading surface** is where the science lives: light, opaque, and never tinted by the environment.
- The contrast between the two is the identity. If the reading surface is darkened to match the frame, the instrument stops being an instrument.

Rules that follow from this:

- The scene never moves behind a reading surface. Content columns are opaque; only chrome is translucent glass.
- Chrome is lit, not decorated: one key light from the upper left, one counter-fill from the lower right.
- The environment is never allowed to compete with a value for attention; it stops at the frame's edge.

The landing page is the clearest statement of the idea. A world enters from the lower right as a luminous limb; the Signal filaments grow out of that limb rather than floating over the page; the statement is held in the negative space the environment leaves open; and the instrument facts sit on a single plate beside it. The scene is the subject of the composition and the prose is never placed on top of it.

## Prohibitions

These are absolute. They are not stylistic preferences.

### 1. Neural structures are metaphor, never measurement

Neural fibres, synapses, signal pathways and brain-like forms may appear only as environment art in the Signal register. They must never be used to represent a participant's state, a recovery stage, a metric, or a comparison. LIMEN does not measure neural or vestibular activity, and no visual may imply that it does.

### 2. No fabricated astronaut telemetry

LIMEN contains no astronaut-level records. There is no NASA dataset behind any screen, and no visual may imply otherwise. Mission-phase structures (preflight, inflight, postflight, reconditioning) and gravity environments may be described as context; they must not be populated with invented measurements, trajectories, vitals or mission events. Simulated demonstration data, if it is ever introduced, must be labelled as simulated at every appearance and must never be mixed with browser-generated records.

### 3. No decorative animation of measured values

Numbers must not count up, tick, morph, pulse or otherwise animate toward a value. Chart geometry must not draw on, and chart series must not re-order themselves on a timer. A value that is present is present; a value that is missing is missing. Animated values invite a reader to interpret a trajectory that does not exist.

### 4. No effect may compromise measurement integrity

- No perspective, camera motion, parallax, blur, shimmer, chromatic aberration, film grain, lens distortion or colour grading may be applied to the assessment task surface or to any measured value.
- No render loop may run during an active trial. Pointer capture, target presentation and timing must not depend on frame scheduling.
- The measured coordinate space is CSS pixels and must not be scaled, transformed, or composited.
- Effects that could alter perceived target position, size or contrast are prohibited even if the underlying data is unaffected.

### 5. The assessment canvas is a protected calibrated measurement surface

The task canvas is a measuring instrument, not a scene. It is a flat, high-contrast, untransformed plane:

- Target radius, target position, cursor size, trail geometry and the pointer-origin procedure are measurement parameters, not styling choices.
- The native pointer visibility rule (hidden during active interaction under protocol v0.3.0) is a measurement protocol requirement and must not be altered for visual effect.
- No element may overlap the canvas in a way that changes perceived target geometry or contrast.
- Any visual work around the canvas is chrome; the canvas itself is not a canvas for art.

### 6. The 3D scene is environment, not evidence

The signature scene may depict an orbital environment and abstract filaments, and it may be the most beautiful thing on the screen. It remains environment art:

- The scene is never attached to a value, a metric, a chart, a participant or a recovery phase.
- It never appears on a measurement surface, and the assessment route never loads it.
- Its geometry is procedural and decorative. It is not a model of a brain, a spacecraft, a planet, an astronaut or any recorded event.
- Because the scene is a metaphor, it may be removed, replaced or disabled without any loss of meaning. Nothing in the product may depend on it being present.

## Governance

- New visual elements are proposed with the register they belong to and the meaning they are allowed to carry.
- Any change to a measured value's presentation requires a review against the prohibitions above and against the measurement-integrity rules in [`METRICS_AND_DEFINITIONS.md`](METRICS_AND_DEFINITIONS.md) and [`DATA_PROVENANCE.md`](DATA_PROVENANCE.md).
- Scientific boundaries are restated in [`LIMITATIONS.md`](LIMITATIONS.md) and are not to be softened by visual design.

## Related documents

- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — tokens, type, spacing, radius, elevation, motion, primitives and accessibility contracts.
- [`METRICS_AND_DEFINITIONS.md`](METRICS_AND_DEFINITIONS.md) — what each number means and how it is computed.
- [`DATA_PROVENANCE.md`](DATA_PROVENANCE.md) — where every record comes from and how it is labelled.
- [`LIMITATIONS.md`](LIMITATIONS.md) — what the prototype cannot do or claim.
