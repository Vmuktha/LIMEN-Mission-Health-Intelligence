import {
  formatRecoveryDate,
  formatRecoveryMetricNumber,
  measurementProtocolShortLabel,
  type RecoveryMetricPresentation,
  type RecoveryTrendPoint,
  type RecoveryTrendSeries,
} from "@/lib/analytics/recovery-dashboard";
import type { MeasurementProtocolVersion } from "@/types/trial";

export const RECOVERY_CHART_WIDTH = 760;
export const RECOVERY_CHART_HEIGHT = 280;
export const RECOVERY_CHART_PADDING = { top: 20, right: 20, bottom: 46, left: 68 } as const;

const PROTOCOL_COLORS: Readonly<Record<MeasurementProtocolVersion | "unknown", string>> = {
  "0.1.0-legacy-origin-unverified": "#b45309",
  "0.2.0-actual-pointer-origin": "#475569",
  "0.3.0-actual-pointer-origin-hidden-cursor": "#0e7490",
  unknown: "#94a3b8",
};

export interface RecoveryChartDomain {
  readonly min: number;
  readonly max: number;
}

/**
 * Builds the plotted value range. A single value receives a symmetric margin
 * so the point is not drawn on the axis. Empty or non-finite input has no
 * domain, and the chart stays empty rather than showing zeros.
 */
export function buildRecoveryChartDomain(min: number | null, max: number | null): RecoveryChartDomain | null {
  if (min === null || max === null) return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) {
    const spread = Math.max(Math.abs(min) * 0.05, 1);
    return { min: min - spread, max: max + spread };
  }
  const span = max - min;
  return { min: min - span * 0.08, max: max + span * 0.08 };
}

/** Evenly spaced axis values from the domain maximum down to the minimum. */
export function buildRecoveryChartTicks(domain: RecoveryChartDomain | null, tickCount = 5): readonly number[] {
  if (!domain) return [];
  if (tickCount < 2) return [domain.max];
  return Array.from({ length: tickCount }, (_, index) => domain.max - ((domain.max - domain.min) * index) / (tickCount - 1));
}

/** Observation indices used for date labels along the horizontal axis. */
export function buildRecoveryChartXIndices(observationCount: number): readonly number[] {
  if (observationCount <= 1) return observationCount === 1 ? [0] : [];
  const candidates = [0, Math.round((observationCount - 1) / 3), Math.round(((observationCount - 1) * 2) / 3), observationCount - 1];
  return [...new Set(candidates)];
}

export interface RecoveryChartPointPosition {
  readonly x: number;
  readonly y: number;
  readonly point: RecoveryTrendPoint;
}

export interface RecoveryChartSegment {
  readonly protocolVersion: MeasurementProtocolVersion | null;
  readonly points: readonly RecoveryChartPointPosition[];
}

export interface RecoveryChartTick {
  readonly value: number;
  readonly y: number;
}

export interface RecoveryChartGeometry {
  readonly width: number;
  readonly height: number;
  readonly padding: typeof RECOVERY_CHART_PADDING;
  readonly observationCount: number;
  readonly domain: RecoveryChartDomain | null;
  readonly ticks: readonly RecoveryChartTick[];
  readonly xIndices: readonly number[];
  readonly xPositions: readonly number[];
  readonly segments: readonly RecoveryChartSegment[];
  readonly zeroLineY: number | null;
  readonly showsZeroLine: boolean;
}

/**
 * Maps a trend series to chart coordinates. Points keep their chronological
 * observation index, so a missing observation leaves a gap instead of being
 * closed. Segments never span a protocol change.
 */
export function buildRecoveryChartGeometry(series: RecoveryTrendSeries): RecoveryChartGeometry {
  const domain = buildRecoveryChartDomain(series.min, series.max);
  const observationCount = series.observations.length;
  const plotWidth = RECOVERY_CHART_WIDTH - RECOVERY_CHART_PADDING.left - RECOVERY_CHART_PADDING.right;
  const plotHeight = RECOVERY_CHART_HEIGHT - RECOVERY_CHART_PADDING.top - RECOVERY_CHART_PADDING.bottom;
  const xForIndex = (index: number) => observationCount <= 1
    ? RECOVERY_CHART_PADDING.left + plotWidth / 2
    : RECOVERY_CHART_PADDING.left + (index / (observationCount - 1)) * plotWidth;
  const yForValue = (value: number) => domain === null
    ? RECOVERY_CHART_PADDING.top + plotHeight / 2
    : RECOVERY_CHART_PADDING.top + ((domain.max - value) / (domain.max - domain.min)) * plotHeight;
  const showsZeroLine = domain !== null && domain.min < 0 && domain.max > 0;

  return {
    width: RECOVERY_CHART_WIDTH,
    height: RECOVERY_CHART_HEIGHT,
    padding: RECOVERY_CHART_PADDING,
    observationCount,
    domain,
    ticks: buildRecoveryChartTicks(domain).map((value) => ({ value, y: yForValue(value) })),
    xIndices: buildRecoveryChartXIndices(observationCount),
    xPositions: series.observations.map((_, index) => xForIndex(index)),
    segments: series.segments.map((segment) => ({
      protocolVersion: segment.protocolVersion,
      points: segment.points.map((point) => ({
        x: xForIndex(point.observationIndex),
        y: yForValue(point.value),
        point,
      })),
    })),
    zeroLineY: showsZeroLine ? yForValue(0) : null,
    showsZeroLine,
  };
}

export function formatRecoveryChartValue(value: number, precision: number): string {
  return formatRecoveryMetricNumber(value, precision);
}

/** Accessible point description used for the SVG point tooltip. */
export function buildRecoveryChartPointLabel(point: RecoveryTrendPoint, presentation: RecoveryMetricPresentation): string {
  const value = formatRecoveryMetricNumber(point.value, presentation.precision);
  return `${formatRecoveryDate(point.observation.completedAt)}: ${value} ${presentation.unitLabel}; ${point.eligibleTrialCount} of ${point.totalTrialCount} trials eligible; ${measurementProtocolShortLabel(point.protocolVersion)}`;
}

export function recoveryChartProtocolColor(protocol: MeasurementProtocolVersion | null): string {
  return PROTOCOL_COLORS[protocol ?? "unknown"];
}
