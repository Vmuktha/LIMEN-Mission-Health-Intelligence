import type { Metadata } from "next";
import { SimulationPerspectiveProvider } from "@/components/simulation/SimulationPerspectiveContext";

export const metadata: Metadata = {
  title: "Astronaut Simulation Workspaces",
  description: "Explore two isolated fictional LIMEN astronaut workspaces with traceable assessment, check-in, mission, and scientific evidence records.",
  robots: { index: false, follow: false },
};

export default function SimulationLayout({ children }: LayoutProps<"/simulation">) {
  return <SimulationPerspectiveProvider>{children}</SimulationPerspectiveProvider>;
}
