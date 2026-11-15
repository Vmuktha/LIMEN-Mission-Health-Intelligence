import { DataCard } from "@/components/ui/InstrumentUI";

const diagrams = [
  {
    id: "assessment-protocol",
    eyebrow: "01 · task protocol",
    title: "Sensorimotor assessment",
    description: "A browser cursor task records pointer behavior across explicitly defined phases. The diagram describes the protocol, not a participant result.",
    steps: ["Positioning", "Baseline", "Adaptation", "Late adaptation", "Washout"],
    note: "The current browser protocol labels four phases: Baseline, Adaptation, Late adaptation and Washout (de-adaptation). Positioning precedes those phases. Targets and timing are protocol parameters; the task surface remains flat and calibrated.",
  },
  {
    id: "derived-metrics",
    eyebrow: "02 · derivation",
    title: "From cursor observations to metrics",
    description: "Raw, timestamped cursor and trial observations are validated before the existing deterministic metric calculations are applied.",
    steps: ["Recorded trials", "Validity checks", "Eligible observations", "Metric-specific summaries"],
    note: "A failed validity or eligibility check withholds that metric; it is not replaced with an estimate or zero.",
  },
  {
    id: "eligibility",
    eyebrow: "03 · metric eligibility",
    title: "Eligibility is metric-specific",
    description: "Protocol consistency, pointer-origin provenance, finite values and trial outcomes constrain which calculations can be shown.",
    steps: ["Protocol known", "Origin verified when required", "Valid trials", "Eligible metric only"],
    note: "Timing metrics and origin-sensitive metrics have different existing eligibility rules. No composite score is created.",
  },
  {
    id: "data-domains",
    eyebrow: "04 · data domains",
    title: "Three separate evidence domains",
    description: "Operational participant data, retrospective NASA research data and any future simulated data have distinct sources and boundaries.",
    steps: ["Browser-local participant records", "NASA OSDR study records", "Future simulation · deferred"],
    note: "No join or shared participant identity is implied. NASA values are not live telemetry; simulation is outside this release.",
  },
] as const;

export function ScientificMethodology() {
  return (
    <section aria-labelledby="methodology-title" className="flex flex-col gap-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Methods · explanatory diagrams</p>
        <h1 id="methodology-title" className="mt-1 text-3xl font-semibold text-glow sm:text-4xl">How LIMEN reads evidence</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-glow-muted">These diagrams explain protocol and data boundaries. They are not measured results, participant state, or telemetry.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        {diagrams.map((diagram) => (
          <DataCard as="article" key={diagram.id} className="p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">{diagram.eyebrow}</p>
            <h3 className="mt-2 text-lg font-semibold text-glow">{diagram.title}</h3>
            <p className="mt-2 text-sm leading-6 text-glow-muted">{diagram.description}</p>
            <ol aria-label={`${diagram.title} explanatory sequence`} className="mt-5 flex flex-wrap items-stretch gap-2">
              {diagram.steps.map((step, index) => (
                <li key={step} className="flex min-w-[8.5rem] flex-1 items-center gap-2">
                  <span className="flex min-h-14 flex-1 items-center rounded-control border border-horizon bg-void/45 px-3 py-2 text-xs font-medium leading-5 text-glow">
                    <span className="mr-2 font-mono text-ion">{String(index + 1).padStart(2, "0")}</span>{step}
                  </span>
                  {index < diagram.steps.length - 1 && <span aria-hidden="true" className="text-horizon">→</span>}
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-horizon/60 pt-3 text-xs leading-5 text-glow-muted">{diagram.note}</p>
          </DataCard>
        ))}
      </div>
    </section>
  );
}
