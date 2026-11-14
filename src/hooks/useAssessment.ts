"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendDisplayedCursorTrajectoryPoint, appendTrajectoryPoint, beginTrialPositioning, completeActiveTrial, createTrialEngineState, invalidateActiveTrial, markActiveTrialMissed, markMovementOnset, pauseAssessment, presentTargetAfterPositioning, resumeAssessment, startAssessment, abortAssessment, type TrialEngineState } from "@/lib/assessment/trial-engine";
import { canProcessPointerEvent, displayedCursorCoordinate, hasMovementOnset, isDisplayedCursorInTarget, clientPointToTaskCoordinate, isWithinStartTolerance, remainingPositioningDwellMs, START_POSITION_DWELL_MS } from "@/lib/assessment/interaction";
import { DEFAULT_ASSESSMENT_PROTOCOL } from "@/lib/assessment/protocol";
import { buildCompletedAssessmentSession, canPersistCompletedSession } from "@/lib/assessment/session-record";
import { saveAssessmentSession } from "@/lib/storage/assessment-storage";
import type { AssessmentSession, InputDevice } from "@/types/assessment";
import type { CursorCoordinate } from "@/types/trial";

const TARGET_RADIUS_CSS_PIXELS = 22;
const TRIAL_TIMEOUT_MS = 12_000;

export interface TaskAreaBounds { readonly left: number; readonly top: number; readonly width: number; readonly height: number; }

export interface BrowserAssessmentController {
  readonly engine: TrialEngineState | null;
  readonly canBegin: boolean;
  readonly persistenceMessage: string | null;
  readonly completedSession: AssessmentSession | null;
  readonly saveStatus: "idle" | "saving" | "saved" | "error";
  setTaskAreaBounds(bounds: TaskAreaBounds): void;
  beginSession(): void;
  pause(): void;
  resume(): void;
  abort(): void;
  handlePointerMove(clientX: number, clientY: number, pointerType: string): void;
  handlePointerCancel(): void;
}

/**
 * Client-side coordinator for the pure trial engine. Raw pointer samples and
 * displayed feedback samples remain separate through the full session.
 */
export function useAssessment(): BrowserAssessmentController {
  const [engine, setEngine] = useState<TrialEngineState | null>(null);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<AssessmentSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [taskAreaReady, setTaskAreaReady] = useState(false);
  const engineRef = useRef<TrialEngineState | null>(null);
  const boundsRef = useRef<TaskAreaBounds | null>(null);
  const presentedPerformanceMsRef = useRef(0);
  const performanceEpochOffsetRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const positioningTimerRef = useRef<number | null>(null);
  const startNextTrialRef = useRef<() => void>(() => undefined);
  const completePositioningRef = useRef<() => void>(() => undefined);
  const positioningEnteredAtRef = useRef<number | null>(null);
  const positioningPointerRef = useRef<CursorCoordinate | null>(null);
  const sessionCreatedAtRef = useRef<string | null>(null);
  const inputDeviceRef = useRef<InputDevice>("unknown");
  const persistedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (advanceRef.current !== null) window.clearTimeout(advanceRef.current);
    if (positioningTimerRef.current !== null) window.clearTimeout(positioningTimerRef.current);
    timeoutRef.current = null;
    advanceRef.current = null;
    positioningTimerRef.current = null;
    positioningEnteredAtRef.current = null;
    positioningPointerRef.current = null;
  }, []);

  const commit = useCallback((next: TrialEngineState) => {
    engineRef.current = next;
    setEngine(next);
  }, []);

  const persistCompletedSession = useCallback(async (completed: TrialEngineState) => {
    const createdAt = sessionCreatedAtRef.current;
    if (!canPersistCompletedSession(completed, persistedRef.current, createdAt) || !createdAt) return;
    persistedRef.current = true;
    const session: AssessmentSession = buildCompletedAssessmentSession(completed, createdAt, inputDeviceRef.current);
    setCompletedSession(session);
    setSaveStatus("saving");
    const result = await saveAssessmentSession(session);
    setSaveStatus(result.ok ? "saved" : "error");
    setPersistenceMessage(result.ok ? "Completed session saved locally in this browser." : `Completed session was not saved: ${result.error.message}`);
  }, []);

  const scheduleTimeout = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const current = engineRef.current;
      if (!current || current.status !== "running" || !current.activeTrial) return;
      const timedOut = markActiveTrialMissed(current);
      commit(timedOut);
      if (timedOut.status === "completed") void persistCompletedSession(timedOut);
      else advanceRef.current = window.setTimeout(() => startNextTrialRef.current(), 250);
    }, TRIAL_TIMEOUT_MS);
  }, [commit, persistCompletedSession]);

  const startNextTrial = useCallback(() => {
    const current = engineRef.current;
    const bounds = boundsRef.current;
    if (!current || !bounds || current.status !== "running" || current.activeTrial || current.positioningTrial) return;
    const center: CursorCoordinate = { x: bounds.width / 2, y: bounds.height / 2 };
    commit(beginTrialPositioning(current, center));
  }, [commit]);

  useEffect(() => { startNextTrialRef.current = startNextTrial; }, [startNextTrial]);

  const completePositioning = useCallback(() => {
    const current = engineRef.current;
    const bounds = boundsRef.current;
    const actualStart = positioningPointerRef.current;
    const enteredAt = positioningEnteredAtRef.current;
    const now = performance.now();
    if (!current || !bounds || !actualStart || !current.positioningTrial || current.status !== "running") return;
    const remainingDwell = remainingPositioningDwellMs(enteredAt, now);
    if (remainingDwell === null) return;
    if (remainingDwell > 0) {
      positioningTimerRef.current = window.setTimeout(() => completePositioningRef.current(), remainingDwell);
      return;
    }
    const distance = Math.max(TARGET_RADIUS_CSS_PIXELS * 3, Math.min(bounds.width, bounds.height) * 0.32);
    const timestamp = timestampForPerformance(now, performanceEpochOffsetRef.current);
    const next = presentTargetAfterPositioning(current, actualStart, distance, timestamp, timestamp);
    positioningEnteredAtRef.current = null;
    positioningPointerRef.current = null;
    positioningTimerRef.current = null;
    presentedPerformanceMsRef.current = now;
    commit(next);
    scheduleTimeout();
  }, [commit, scheduleTimeout]);

  useEffect(() => { completePositioningRef.current = completePositioning; }, [completePositioning]);

  const settleAndAdvance = useCallback((next: TrialEngineState) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    commit(next);
    if (next.status === "completed") { void persistCompletedSession(next); return; }
    advanceRef.current = window.setTimeout(startNextTrial, 250);
  }, [commit, persistCompletedSession, startNextTrial]);

  const beginSession = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds || bounds.width < 240 || bounds.height < 240) {
      setPersistenceMessage("Make the task area visible and at least 240 CSS pixels wide and high before beginning.");
      return;
    }
    clearTimers();
    const sessionId = globalThis.crypto?.randomUUID?.() ?? `limen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ready = createTrialEngineState(sessionId, DEFAULT_ASSESSMENT_PROTOCOL);
    const startPerformanceMs = performance.now();
    performanceEpochOffsetRef.current = Date.now() - startPerformanceMs;
    sessionCreatedAtRef.current = timestampForPerformance(startPerformanceMs, performanceEpochOffsetRef.current);
    inputDeviceRef.current = "unknown";
    persistedRef.current = false;
    setCompletedSession(null);
    setSaveStatus("idle");
    setPersistenceMessage(null);
    const running = startAssessment(ready);
    commit(running);
    // Commit first so the synchronous start helper always observes the same engine state.
    engineRef.current = running;
    startNextTrial();
  }, [clearTimers, commit, startNextTrial]);

  const pause = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.status !== "running") return;
    clearTimers();
    // An active trial is invalidated by pausing, never resumed with paused time included.
    const paused = pauseAssessment(current);
    commit(paused);
    if (paused.status === "completed") void persistCompletedSession(paused);
  }, [clearTimers, commit, persistCompletedSession]);

  const resume = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.status !== "paused") return;
    const resumed = resumeAssessment(current);
    commit(resumed);
    if (resumed.activeTrial) scheduleTimeout(); else if (!resumed.positioningTrial) startNextTrial();
  }, [commit, scheduleTimeout, startNextTrial]);

  const abort = useCallback(() => {
    const current = engineRef.current;
    if (!current) return;
    clearTimers();
    commit(abortAssessment(current));
    setPersistenceMessage("Session aborted. It was not saved as a completed assessment.");
  }, [clearTimers, commit]);

  const handlePointerMove = useCallback((clientX: number, clientY: number, pointerType: string) => {
    const current = engineRef.current;
    const bounds = boundsRef.current;
    if (!current || !bounds || !canProcessPointerEvent(current.status === "running", current.activeTrial !== null, current.positioningTrial !== null)) return;
    const actual = clientPointToTaskCoordinate(clientX, clientY, bounds);
    if (!actual) return;
    if (inputDeviceRef.current === "unknown") inputDeviceRef.current = pointerType === "mouse" ? "mouse" : "unknown";
    if (current.positioningTrial) {
      const now = performance.now();
      if (!isWithinStartTolerance(actual, current.positioningTrial.designatedStartPosition)) {
        positioningEnteredAtRef.current = null;
        positioningPointerRef.current = null;
        if (positioningTimerRef.current !== null) window.clearTimeout(positioningTimerRef.current);
        positioningTimerRef.current = null;
        return;
      }
      positioningPointerRef.current = actual;
      if (positioningEnteredAtRef.current === null) {
        positioningEnteredAtRef.current = now;
        positioningTimerRef.current = window.setTimeout(() => completePositioningRef.current(), START_POSITION_DWELL_MS);
      }
      return;
    }
    const active = current.activeTrial;
    if (!active) return;
    const elapsedMs = Math.max(0, performance.now() - presentedPerformanceMsRef.current);
    const displayed = displayedCursorCoordinate(actual, active.startPosition, active.plan.rotationCondition);
    let next = appendTrajectoryPoint(current, { ...actual, elapsedMs });
    next = appendDisplayedCursorTrajectoryPoint(next, { ...displayed, elapsedMs });
    const eventTimestamp = timestampForPerformance(performance.now(), performanceEpochOffsetRef.current);
    if (!active.movementOnsetAt && hasMovementOnset(active.startPosition, actual)) next = markMovementOnset(next, eventTimestamp);
    if (isDisplayedCursorInTarget(displayed, active.target, TARGET_RADIUS_CSS_PIXELS)) {
      settleAndAdvance(completeActiveTrial(next, eventTimestamp));
    } else commit(next);
  }, [commit, settleAndAdvance]);

  const handlePointerCancel = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.status !== "running") return;
    if (current.positioningTrial) {
      positioningEnteredAtRef.current = null;
      positioningPointerRef.current = null;
      if (positioningTimerRef.current !== null) window.clearTimeout(positioningTimerRef.current);
      positioningTimerRef.current = null;
      return;
    }
    if (!current.activeTrial) return;
    settleAndAdvance(invalidateActiveTrial(current, "Pointer interaction was cancelled before target acquisition."));
  }, [settleAndAdvance]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const setTaskAreaBounds = useCallback((bounds: TaskAreaBounds) => {
    boundsRef.current = bounds;
    setTaskAreaReady(bounds.width >= 240 && bounds.height >= 240);
  }, []);

  return { engine, canBegin: taskAreaReady, persistenceMessage, completedSession, saveStatus, setTaskAreaBounds, beginSession, pause, resume, abort, handlePointerMove, handlePointerCancel };
}

/** Maps a monotonic `performance.now()` reading to the session's ISO timestamp origin. */
function timestampForPerformance(performanceMs: number, epochOffsetMs: number): string {
  return new Date(epochOffsetMs + performanceMs).toISOString();
}
