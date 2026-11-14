import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Mission Health Intelligence",
  description:
    "LIMEN connects crew context, self-reported observations, visuomotor adaptation and retrospective research evidence in a mission-aware, browser-local prototype. Descriptive only; not a diagnostic system.",
};

export default function Home() {
  return (
    <AppShell variant="immersive">
      <LandingExperience />
    </AppShell>
  );
}
