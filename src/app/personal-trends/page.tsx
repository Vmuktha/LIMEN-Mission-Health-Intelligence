import type { Metadata } from "next";
import { PersonalTrendsDashboard } from "@/components/personal-trends/PersonalTrendsDashboard";

export const metadata: Metadata = {
  title: "Personal Trends",
  description: "Explore browser-local assessment measurements and subjective check-in observations separately, with protocol, eligibility, and missing-data boundaries preserved.",
};

export default function PersonalTrendsPage() {
  return <PersonalTrendsDashboard />;
}
