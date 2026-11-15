import { Suspense } from "react";
import { SimulationLab } from "@/components/simulation/SimulationLab";

export default function SimulationAssessmentsPage(props: PageProps<"/simulation/assessments">) {
  return <Suspense fallback={<SimulationRouteFallback />}><SessionSelectedPage searchParams={props.searchParams} /></Suspense>;
}

async function SessionSelectedPage({ searchParams }: { readonly searchParams: PageProps<"/simulation/assessments">["searchParams"] }) {
  const { session } = await searchParams;
  return <SimulationLab view="assessments" initialSessionId={Array.isArray(session) ? session[0] : session} />;
}

function SimulationRouteFallback() {
  return <main aria-live="polite" className="min-h-screen bg-[#07111f] px-6 py-10 text-sm text-slate-300">Loading fictional assessment record…</main>;
}
