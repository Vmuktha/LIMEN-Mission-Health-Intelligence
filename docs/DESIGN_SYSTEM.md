# Design system

## Intent

LIMEN is a scientific instrument with a cinematic surface. The interface must feel like an aerospace research readout, never like a wellness dashboard and never like clinical telemetry. Every visual decision is governed by three registers, defined in [`VISUAL_CHARTER.md`](VISUAL_CHARTER.md):

- **Orbit** — the altered-gravity environment the research concerns. Ambient background and transitions only.
- **Signal** — the neural and physiological metaphor. Environment art only; never attached to a value.
- **Instrument** — the readout surface where every number, label and explanation lives.

This document defines the implementation vocabulary: tokens, type, spacing, radius, elevation, motion, primitives and accessibility contracts.

## Principles

- Make the research/prototype status visible in shared navigation and user-facing language.
- Prefer plain-language labels over opaque scores or readiness colours.
- Preserve provenance labels near any future data display: published, user-generated, or simulated.
- Use accessible semantic headings, navigation landmarks, and discernible link text.
- Treat uncertainty and incomplete data as first-class visual states; do not turn absent data into reassuring zeros.
- Reserve charts, mission scenes, and 3D graphics for later phases when the underlying calculation and provenance are implemented.
- Colour communicates a role — availability, warning, protocol identity — never a judgement about a person.

## Colour tokens

Tokens live in `src/app/globals.css` and are the only colour source a component may use. Raw palette steps (`slate-500`, `cyan-300`) are not part of the contract.

### Dark instrument system

The approved palette for the cinematic redesign. Adopted route by route in later phases.

| Token | Value | Role |
| --- | --- | --- |
| `void` | `#05070F` | Deepest canvas; base of the orbital environment |
| `hull` | `#0B101C` | Primary panel surface |
| `hull-raised` | `#141B2B` | Raised panel, control surface |
| `horizon` | `#1E293B` | Borders, dividers, chart gridlines |
| `ion` | `#22D3EE` | Primary accent: focus, active state, current data |
| `ion-soft` | `#67E8F9` | Accent highlight and highlight text |
| `plasma` | `#A78BFA` | Neural-fibre register; environment art only |
| `plasma-bright` | `#E879F9` | Neural-fibre highlight; environment art only |
| `ember` | `#F59E0B` | Warning, legacy protocol, unavailable comparison |
| `alert` | `#F43F5E` | Errors only — never "poor performance" |
| `glow` | `#F8FAFC` | Primary text on dark surfaces |
| `glow-muted` | `#94A3B8` | Secondary text on dark surfaces |
| `glow-faint` | `#62748E` | Tertiary text and gridlines on dark surfaces |

### Light surfaces

The vocabulary the current product surfaces use, tokenised without changing how they look.

| Token | Value | Role |
| --- | --- | --- |
| `surface` | `#FFFFFF` | Card and panel surface |
| `surface-muted` | `#F8FAFC` | Sunken surface, inline notice, page canvas |
| `surface-sunken` | `#F1F5F9` | Recessed controls |
| `line` | `#E2E8F0` | Hairline border, divider |
| `line-strong` | `#CAD5E2` | Emphasised border, control border |
| `ink` | `#0F172B` | Body text |
| `ink-strongest` | `#020618` | Headings, numeric values |
| `ink-strong` | `#314158` | Secondary text in notices |
| `ink-soft` | `#45556C` | Supporting copy |
| `ink-muted` | `#62748E` | Labels, metadata, captions |
| `ink-faint` | `#90A1B9` | Least-emphasised text |
| `accent-edge` | `#A2F4FD` | Accent border |
| `accent-wash` | `#ECFEFF` | Accent fill |
| `accent-ink` | `#005F78` | Accent text on light surfaces |
| `accent-label` | `#007492` | Section eyebrow and label text |
| `ember-edge` / `ember-wash` / `ember-ink` | `#FEE685` / `#FFFBEB` / `#7B3306` | Warning border / fill / text |
| `alert-edge` / `alert-wash` / `alert-ink` | `#FFCCD3` / `#FFF1F2` / `#8B0836` | Error border / fill / text |

### Rules

- Use `ion`, `plasma`, `ember` and `alert` for identity and status. Never for performance judgement.
- Keep protocol-identity colours stable across surfaces: v0.1.0 amber, v0.2.0 slate, v0.3.0 ion.
- Text on a surface must meet WCAG AA (4.5:1) at its rendered size. `ink-muted` is the floor on `surface`; `glow-muted` is the floor on `void`/`hull`.
- Never encode a state by colour alone — pair it with a label or an explicit value.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Display | Geist | `text-display-md`, `text-display-lg`, `text-display-xl`; tracking −0.015em to −0.03em, line height 1.02–1.15 |
| Interface | Geist | Body and UI text; the body stack is Geist with system fallbacks |
| Data | Geist Mono | Every number, identifier, protocol label and UTC timestamp |

- Type scale: 12 / 13 / 14 / 16 / 20 / 28 / 40 / 64 / 96 (px-equivalent).
- Numbers that can change are always tabular (`tabular-nums`) so columns stay aligned.
- Data is never animated: no count-ups, no morphing values.
- Uppercase micro-labels use 0.12–0.26em tracking at 11–12px only.

## Spacing, radius, elevation

- Spacing follows Tailwind's 0.25rem base scale. Section rhythm is `space-y-6` between regions and `gap-4`/`gap-5` within a region.
- Radius: `rounded-control` (0.5rem) for controls and inline elements, `rounded-card` (0.75rem) for nested panels, `rounded-panel` (1rem) for top-level regions.
- Elevation: `shadow-card` for resting panels, `shadow-panel` for raised panels, `shadow-overlay` for transient overlays. Glass and glow belong to environment chrome, never to panels that carry measured values.

## Motion

- Durations: `duration-fast` (120ms), `duration-base` (240ms), `duration-slow` (480ms).
- Easings: `ease-linen` (cubic-bezier(.2,.8,.2,1)) for entrances, `ease-linen-exit` (cubic-bezier(.4,0,1,1)) for exits.
- One dominant move per transition: content fades and rises 8px, panels scale 0.98→1, scene changes wipe or shift camera state.
- Motion never carries information. A value that is present is present; a value that is missing is missing.
- `prefers-reduced-motion: reduce` is honoured globally in `globals.css`: animation and transition durations collapse to 0.01ms and scrolling becomes instant.

## Focus and accessibility baseline

- Every keyboard-reachable element receives a 2px `ion` outline with a 2px offset through the global `:focus-visible` rule in `globals.css`.
- A component may opt out with `outline-none` only when it provides an equivalent visible indicator of at least equal prominence (for example the assessment task canvas, which uses a `focus-visible` ring instead).
- Interactive elements use semantic elements — native `button`, `select`, `input`, `summary`, `a` — with accessible names.
- Regions are labelled with `aria-labelledby` pointing at their heading.
- Data that cannot be expressed visually is always available as text.

## Application shell

The shell is the frame around the instrument. It is built from four layers, in this order of depth:

1. **Scene** — a fixed, full-viewport composition behind everything (`src/components/scene/SceneBackground.tsx`). It is CSS only in this phase and is decorative by construction.
2. **Header** — a sticky glass band spanning the viewport, carrying the brand mark, the product line and the research status.
3. **Navigation** — a sticky rail at the large breakpoint and a compact strip inside the header below it.
4. **Content column** — a light reading surface (`bg-surface-muted`) that keeps route content legible.

### Scene provider

`src/components/scene/SceneProvider.tsx` owns the environment contract and is the seam where a WebGL scene will later take over.

| Value | Meaning |
| --- | --- |
| `variant` | `orbital` (default), `signal`, `plain` — selects the composition |
| `layer` | `css` today; `webgl` when a canvas renderer is mounted |
| `reducedMotion` | Live `prefers-reduced-motion` state |
| `motionResolved` | True once the motion preference has been read, so the scene can be skipped entirely |
| `webglActive` | True once the WebGL scene is mounted, so the CSS composition steps aside |

The CSS composition is built only from tokens: the Orbit register supplies the deep field, the key light, the orbital rings and the horizon limb; the Signal register supplies abstract filament traces. The reduced-motion baseline in `globals.css` freezes any remaining animation.

### The signature WebGL scene

The landing page may request the `webgl` layer. The scene is a client-only dynamic import inside a Client Component, so it never renders on the server and never reaches any other route.

| Rule | Implementation |
| --- | --- |
| Never block the page | The scene is a separate chunk, requested after mount; the CSS composition is already on screen |
| Never download what cannot be used | WebGL support is detected before the chunk is requested; a device without WebGL, or a visitor who prefers reduced motion, downloads nothing |
| Never shift the layout | The canvas is absolutely positioned inside the hero, so the document never reflows when it arrives (measured cumulative layout shift: 0) |
| Respect reduced motion | With reduced motion the scene is not mounted at all and the static CSS composition remains |
| Survive context loss | A lost context releases the canvas and hands the composition back to CSS |
| Stay inside the budget | 9,000 points, 11,360 triangles, no textures, no environment maps, no post-processing, device-pixel-ratio capped at 1.75 (1.25 on low-power devices) |
| Stay off the measurement paths | The canvas is `pointer-events: none`, lives only on the landing route, and never overlaps the assessment canvas |

### Navigation

- Large breakpoint (≥ 64rem): a 272px sticky rail, grouped as **Context**, **Operate** and **Analyse**. The active route carries `aria-current="page"`, an ion-tinted surface and a 2px ion rule; hover lifts the surface only.
- Below the large breakpoint: a compact strip inside the header. Items are icon plus short label, sized to fit a 390px viewport without horizontal scrolling, and the active item is marked with an ion underline.
- Exactly one `<nav aria-label="Primary">` is displayed at any width; the other is removed from the accessibility tree.
- The header also states the research status. The rail closes with a provenance note, so the status stays in the frame on every route.

### Chrome lighting

The header and the rail carry their own light: a key gradient from the upper left, a counter-fill from the lower right, and a hairline ion seam along the header's lower edge. Chrome is glass (translucent `hull` over the scene with a backdrop blur); the content column is never translucent, so a moving scene can never shift the contrast behind a value.

### Breakpoints

| Range | Chrome | Navigation | Content |
| --- | --- | --- | --- |
| ≥ 64rem | Sticky glass header, 272px rail | Vertical rail with groups | Wide reading surface beside the rail |
| 48–64rem | Header with compact strip | Horizontal strip inside the header | Full-width reading surface |
| < 48rem | Condensed header with compact strip | Horizontal strip inside the header | Full-width reading surface, no compression |

`--shell-chrome-height` records the chrome height per breakpoint so full-bleed surfaces can size themselves against it.

### Landing composition

The landing route uses the `immersive` shell variant: the reading surface is dropped so the composition can run full-bleed, while the header, the rail and the scene contract stay identical to every other route.

The hero is composed in four depths, not as a stack of cards:

1. **Deep field** — a void gradient with a single ion key light placed off the lower right.
2. **Orbital horizon** — the atmospheric limb of a world, drawn in SVG with a terminator gradient, a blurred atmosphere and one faint orbital track.
3. **Signal filaments** — branching traces that grow out of the limb, with luminous nodes at their ends.
4. **The statement** — editorial type held in the negative space to the left, with the provenance line and the protocol facts as an instrument plate on the right.

Placement is a composition decision, not a scale. At the large and medium breakpoints the limb sweeps through the lower right of the frame; below the medium breakpoint it rises across the bottom and the filaments are repositioned to grow from it, so the small-screen composition is designed rather than cropped.

### Landing motion

- Chapters reveal with an 18px rise and a 480ms fade, driven by a `data-visible` attribute so the animation never costs a React render (`src/hooks/useScrollReveal.ts`).
- Pointer movement shifts the horizon and the filaments by different amounts, which reads as depth. It is disabled for coarse pointers and whenever reduced motion is requested.
- With reduced motion, every chapter is visible immediately, nothing animates, and the reveal transform is removed in CSS as well as in JavaScript.

## UI primitives

`src/components/ui` is the shared component vocabulary. Feature modules compose these instead of re-implementing them.

| Primitive | Purpose |
| --- | --- |
| `Button` | `primary`, `secondary`, `ghost`, `danger`; `sm`/`md`; disabled state; colour transition only |
| `Card` | Surface in `paper`, `hull` or `void`; `padding` of `none`/`sm`/`md`/`section`; `elevation` of `none`/`card`/`panel`/`overlay`; `radius` of `control`/`card`/`panel`; renders `div`, `section`, `article` or `aside` |
| `Badge` | Compact status label: `neutral`, `accent`, `warning`, `quiet`, `danger` |
| `Notice` | Inline message carrying a limitation, warning or failure; `neutral`, `warning`, `error` |
| `SectionHeader` | Eyebrow, heading, supporting copy and a control slot; heading `id` pairs with the section's `aria-labelledby` |
| `Stat` | One figure inside a definition list; numeric value in tabular figures, with optional detail |

Rules:
- A primitive never decides meaning. It presents the role it is given.
- Features must not keep private copies of a primitive's markup; import from `@/components/ui`.
- A primitive must not be used to hide an unavailable value. Unavailable is stated in words.

## Recovery dashboard

The Recovery Intelligence dashboard is a light, instrument-like research surface: restrained cyan accents, neutral slate structure, tabular numerals, and readable inline SVG. It should feel closer to an aerospace research readout than a generic wellness dashboard.

- Keep the research-prototype and browser-local profile disclosures in the header and data-quality section.
- Use colour for protocol identity and availability, not for judging performance. Do not use green/red to imply improvement or deterioration.
- Show unavailable values in text, not as zero-height marks, zero-value points, or reassuring placeholders.
- Break trend lines at protocol changes and missing observations. Label lines as visual guides and provide an accessible table of the same observations.
- Keep controls semantic and labelled; use native selects and buttons with visible focus states.
- Preserve subjective self-report wording and scales exactly. Show unanswered items as unanswered.
- Prefer bordered sections and compact stat groups over many nested cards or decorative effects.
- Keep multiple check-ins and alignment pairs individually visible; avoid collapsing them into a single score.
- Use `<details>` for secondary scientific explanations so the primary measurements remain readable.
- State the unit once per metric instead of repeating it inside every number, and keep signed differences unit-free so they cannot be read as a judgement.
- Label timestamps with their timezone (UTC) wherever a stored time is displayed.
- When a control offers selectable candidates, show each candidate's compatibility and ineligibility reasons before it is chosen; never present a candidate that cannot be used as if it were ordinary.

## Migration status

Phase 8A-0 establishes the foundation only. The token layer, typography, focus baseline, reduced-motion baseline, shared primitives and metadata are in place. Individual routes adopt the dark instrument system in later phases; until then the light surfaces render exactly as before.
