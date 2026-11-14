"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRecoveryDataset } from "@/lib/analytics/recovery";
import type { RecoveryDataset } from "@/types/recovery";

export type RecoveryDatasetLoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly dataset: RecoveryDataset };

/**
 * Loads browser-local recovery records once per mount. The request counter
 * prevents an unmounted or superseded request from updating component state.
 */
export function useRecoveryDataset(): RecoveryDatasetLoadState & { readonly reload: () => Promise<void> } {
  const [state, setState] = useState<RecoveryDatasetLoadState>({ status: "loading" });
  const requestIdRef = useRef(0);

  const readRecords = useCallback(async (requestId: number) => {
    try {
      const result = await loadRecoveryDataset();
      if (requestIdRef.current !== requestId) return;
      setState(result.ok
        ? { status: "ready", dataset: result.value }
        : { status: "error", message: result.error.message });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setState({
        status: "error",
        message: error instanceof Error && error.message
          ? error.message
          : "The browser-local recovery records could not be read.",
      });
    }
  }, []);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: "loading" });
    await readRecords(requestId);
  }, [readRecords]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    void readRecords(requestId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [readRecords]);

  return { ...state, reload };
}
