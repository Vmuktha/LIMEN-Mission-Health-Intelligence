import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, DetailPanel, PageHeader, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { scientificEvidenceRegistry } from "@/lib/evidence/studies";

export default function EvidencePage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader eyebrow="Analyse · published sources" title="Scientific evidence" description="A source-linked registry of published research and standards that inform LIMEN. These references are not LIMEN records, mission telemetry, or a validation claim for this prototype." aside={<ProvenanceLabel>Source registry</ProvenanceLabel>} />
        <div className="grid gap-4 xl:grid-cols-2">
          {scientificEvidenceRegistry.map((study) => (
            <DataCard key={study.id} className="flex flex-col p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <ProvenanceLabel tone={study.sourceType.startsWith("nasa") ? "warning" : "accent"}>{study.sourceType.replaceAll("-", " ")}</ProvenanceLabel>
                <span className="text-xs text-glow-muted">{study.publicationYear ?? "Year not specified"}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-7 text-glow">{study.title}</h2>
              <p className="mt-2 text-sm text-glow-muted">{study.authorsOrOrganization.join(", ")}</p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-control border border-horizon/70 bg-void/40 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-glow-muted">Population / source</dt>
                  <dd className="mt-1 text-sm leading-6 text-glow">{study.researchPopulation.description}</dd>
                </div>
                <div className="rounded-control border border-horizon/70 bg-void/40 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-glow-muted">Reported sample</dt>
                  <dd className="mt-1 text-sm text-glow">{study.researchPopulation.sampleSize === null ? "Not specified in the cited source" : study.researchPopulation.sampleSize}</dd>
                </div>
              </dl>
              <div className="mt-4"><DetailPanel title="Methods and reported findings"><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="font-semibold text-glow">Methodology</h3><ul className="mt-2 list-disc space-y-1 pl-5">{study.methodology.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3 className="font-semibold text-glow">Reported findings</h3><ul className="mt-2 list-disc space-y-1 pl-5">{study.mainReportedFindings.map((item) => <li key={item}>{item}</li>)}</ul></div></div></DetailPanel></div>
              <div className="mt-5 flex flex-1 flex-col gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-glow-muted">Relevance to LIMEN</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-glow">{study.relevanceToLimen.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Limitations</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-glow-muted">{study.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <a href={study.officialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-ion-soft underline-offset-4 hover:underline">Open cited source<span aria-hidden="true">↗</span></a>
            </DataCard>
          ))}
        </div>
        <DataCard className="p-5 sm:p-6">
          <h2 className="font-semibold text-glow">Separate research data</h2>
          <p className="mt-2 text-sm leading-6 text-glow-muted">NASA Open Science Data Repository (OSDR) datasets are shown in a separate source-data explorer. Their retrospective values are not user records or live mission telemetry.</p>
          <Link href="/evidence/osdr" className="mt-4 inline-flex rounded-control border border-horizon px-4 py-2 text-sm font-medium text-glow hover:border-ion/50 hover:text-ion-soft">Open OSDR data explorer</Link>
        </DataCard>
      </div>
    </AppShell>
  );
}
