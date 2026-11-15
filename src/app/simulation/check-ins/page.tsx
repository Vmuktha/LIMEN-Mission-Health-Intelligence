import { Suspense } from "react";
import { SimulationLab } from "@/components/simulation/SimulationLab";

export default function SimulationCheckInsPage(props: PageProps<"/simulation/check-ins">) {
  return <Suspense fallback={<SimulationRouteFallback />}><CheckInSelectedPage searchParams={props.searchParams} /></Suspense>;
}

async function CheckInSelectedPage({ searchParams }: { readonly searchParams: PageProps<"/simulation/check-ins">["searchParams"] }) {
  const { checkin } = await searchParams;
  return <SimulationLab view="check-ins" initialCheckInId={Array.isArray(checkin) ? checkin[0] : checkin} />;
}

function SimulationRouteFallback() {
  return <main aria-live="polite" className="min-h-screen bg-[#07111f] px-6 py-10 text-sm text-slate-300">Loading fictional crew check-in…</main>;
}
