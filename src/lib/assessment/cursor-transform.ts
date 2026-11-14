import type { CursorCoordinate } from "@/types/trial";

/** Screen-space convention: +x is right and +y is down. Angles are clockwise. */
export function rotateScreenVectorClockwise(vector: CursorCoordinate, degrees: number): CursorCoordinate {
  assertFiniteCoordinate(vector, "vector");
  assertFiniteNumber(degrees, "degrees");
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { x: cosine * vector.x - sine * vector.y, y: sine * vector.x + cosine * vector.y };
}

/** Mathematical-space convention: +x is right and +y is up; angles are counterclockwise. */
export function screenVectorToMathematical(vector: CursorCoordinate): CursorCoordinate {
  assertFiniteCoordinate(vector, "vector");
  return { x: vector.x, y: -vector.y };
}

export function mathematicalVectorToScreen(vector: CursorCoordinate): CursorCoordinate {
  assertFiniteCoordinate(vector, "vector");
  return { x: vector.x, y: -vector.y };
}

/**
 * Maps an actual pointer coordinate to displayed visual feedback around an
 * origin. This changes only visual feedback; it does not represent hand motion.
 */
export function applyClockwiseFeedbackRotation(actual: CursorCoordinate, origin: CursorCoordinate, degrees = 45): CursorCoordinate {
  assertFiniteCoordinate(actual, "actual coordinate");
  assertFiniteCoordinate(origin, "origin");
  assertFiniteNumber(degrees, "degrees");
  const relative = { x: actual.x - origin.x, y: actual.y - origin.y };
  const rotated = rotateScreenVectorClockwise(relative, degrees);
  return { x: origin.x + rotated.x, y: origin.y + rotated.y };
}

/** Reverses `applyClockwiseFeedbackRotation` for a finite rotation angle. */
export function removeClockwiseFeedbackRotation(displayed: CursorCoordinate, origin: CursorCoordinate, degrees = 45): CursorCoordinate {
  assertFiniteCoordinate(displayed, "displayed coordinate");
  assertFiniteCoordinate(origin, "origin");
  assertFiniteNumber(degrees, "degrees");
  const relative = { x: displayed.x - origin.x, y: displayed.y - origin.y };
  const unrotated = rotateScreenVectorClockwise(relative, -degrees);
  return { x: origin.x + unrotated.x, y: origin.y + unrotated.y };
}

function assertFiniteCoordinate(coordinate: CursorCoordinate, label: string): void {
  assertFiniteNumber(coordinate.x, `${label}.x`);
  assertFiniteNumber(coordinate.y, `${label}.y`);
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}
