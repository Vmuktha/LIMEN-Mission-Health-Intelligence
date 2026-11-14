import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Between worlds",
  description:
    "LIMEN is a browser-local research prototype for studying how sensorimotor behaviour adapts when the environment changes. Descriptive measurements only.",
};

export default function Home() {
  return (
    <AppShell variant="immersive">
      <LandingExperience />
    </AppShell>
  );
}
