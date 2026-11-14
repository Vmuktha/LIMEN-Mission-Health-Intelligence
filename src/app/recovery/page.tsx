import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RecoveryDashboard } from "@/components/recovery/RecoveryDashboard";

export const metadata: Metadata = {
  title: "Recovery Intelligence",
  description: "Browser-local longitudinal sensorimotor recovery observations, personal reference sessions, and descriptive self-report alignment.",
};

export default function RecoveryPage() {
  return <AppShell><RecoveryDashboard /></AppShell>;
}
