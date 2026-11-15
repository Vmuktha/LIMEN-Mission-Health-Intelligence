"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AstronautId } from "@/lib/simulation/profiles";

export type SimulationPerspective = "crew" | "flight" | "science";

interface SimulationPerspectiveValue {
  readonly perspective: SimulationPerspective;
  readonly setPerspective: (value: SimulationPerspective) => void;
  readonly astronautId: AstronautId;
  readonly setAstronautId: (value: AstronautId) => void;
  readonly reviewedRecords: Readonly<Record<string, boolean>>;
  readonly setReviewedRecords: (value: Readonly<Record<string, boolean>>) => void;
  readonly dismissedAlerts: Readonly<Record<AstronautId, boolean>>;
  readonly dismissAlerts: (id: AstronautId) => void;
}

const SimulationPerspectiveContext = createContext<SimulationPerspectiveValue | null>(null);

export function SimulationPerspectiveProvider({ children }: { readonly children: ReactNode }) {
  const [perspective, setPerspective] = useState<SimulationPerspective>("crew");
  const [astronautId, setAstronautIdState] = useState<AstronautId>("mara-venn");
  const [reviewedRecords, setReviewedRecords] = useState<Readonly<Record<string, boolean>>>({});
  const [dismissedAlerts, setDismissedAlerts] = useState<Readonly<Record<AstronautId, boolean>>>({ "mara-venn": false, "clara-reyes": false });
  const setAstronautId = useCallback((id: AstronautId) => {
    setAstronautIdState(id);
    setDismissedAlerts((current) => ({ ...current, [id]: false }));
  }, []);
  const dismissAlerts = useCallback((id: AstronautId) => setDismissedAlerts((current) => ({ ...current, [id]: true })), []);
  return <SimulationPerspectiveContext.Provider value={{ perspective, setPerspective, astronautId, setAstronautId, reviewedRecords, setReviewedRecords, dismissedAlerts, dismissAlerts }}>{children}</SimulationPerspectiveContext.Provider>;
}

export function useSimulationPerspective() {
  const value = useContext(SimulationPerspectiveContext);
  if (!value) throw new Error("Simulation pages must be rendered inside SimulationPerspectiveProvider.");
  return value;
}
