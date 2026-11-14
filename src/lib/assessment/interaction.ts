import { applyClockwiseFeedbackRotation } from "./cursor-transform";
import type { CursorCoordinate, RotationCondition, TargetPosition } from "@/types/trial";

export const MOVEMENT_ONSET_DISTANCE_CSS_PIXELS = 3;
export const START_POSITION_TOLERANCE_CSS_PIXELS = 12;
export const START_POSITION_DWELL_MS = 250;

/** Converts a browser client coordinate to CSS-pixel coordinates local to the task area. */
export function clientPointToTaskCoordinate(clientX: number, clientY: number, bounds: Pick<DOMRect, "left" | "top" | "width" | "height">): CursorCoordinate | null {
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) return null;
  return { x: clientX - bounds.left, y: clientY - bounds.top };
}

export function displayedCursorCoordinate(actual: CursorCoordinate, start: CursorCoordinate, condition: RotationCondition): CursorCoordinate {
  return condition === "clockwise-45-degrees" ? applyClockwiseFeedbackRotation(actual, start) : actual;
}

export function hasMovementOnset(start: CursorCoordinate, actual: CursorCoordinate, threshold = MOVEMENT_ONSET_DISTANCE_CSS_PIXELS): boolean {
  return Number.isFinite(threshold) && threshold >= 0 && Math.hypot(actual.x - start.x, actual.y - start.y) >= threshold;
}

export function isWithinStartTolerance(actual: CursorCoordinate, marker: CursorCoordinate, tolerance = START_POSITION_TOLERANCE_CSS_PIXELS): boolean {
  return Number.isFinite(tolerance) && tolerance > 0 && Math.hypot(actual.x - marker.x, actual.y - marker.y) <= tolerance;
}

export function hasCompletedPositioning(enteredToleranceAtMs: number | null, currentMs: number, dwellMs = START_POSITION_DWELL_MS): boolean {
  return enteredToleranceAtMs !== null && Number.isFinite(currentMs) && Number.isFinite(dwellMs) && dwellMs >= 0 && currentMs - enteredToleranceAtMs >= dwellMs;
}

/** Remaining dwell time, allowing a one-shot browser timer to retry if it fires early. */
export function remainingPositioningDwellMs(enteredToleranceAtMs: number | null, currentMs: number, dwellMs = START_POSITION_DWELL_MS): number | null {
  if (enteredToleranceAtMs === null || !Number.isFinite(currentMs) || !Number.isFinite(dwellMs) || dwellMs < 0) return null;
  return Math.max(0, dwellMs - (currentMs - enteredToleranceAtMs));
}

/** Pointer input is valid during either pre-target positioning or an active target trial. */
export function canProcessPointerEvent(isRunning: boolean, hasActiveTrial: boolean, hasPositioningTrial: boolean): boolean {
  return isRunning && (hasActiveTrial || hasPositioningTrial);
}

/** Target acquisition is evaluated against the displayed feedback cursor, never the raw pointer. */
export function isDisplayedCursorInTarget(displayed: CursorCoordinate, target: TargetPosition, targetRadius: number): boolean {
  return Number.isFinite(targetRadius) && targetRadius > 0 && Math.hypot(displayed.x - target.x, displayed.y - target.y) <= targetRadius;
}
