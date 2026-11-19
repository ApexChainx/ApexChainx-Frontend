/** ApexChain Network Operations Intelligence Platform */
/**
 * Trend range selection hook (Issue #968).
 *
 * Manages the time range of a trend chart or summary: a preset ("Last 7
 * days", "This month", ...) or a custom range, plus the labels and query
 * parameters derived from it. Ranges are `YYYY-MM-DD` strings in UTC, built
 * with the workspace date-range utilities.
 *
 * The clock is injectable (`now`) so presets are deterministic in tests and
 * previews. It is read when a preset is chosen, not on every render, so a
 * range never shifts underneath the user. Pass a stable function (defined
 * outside the component or memoised) to keep the returned callbacks stable.
 */
import { useCallback, useMemo, useState } from "react";

import {
  createPresetRange,
  formatDateRangeLabel,
  type DateRange,
  type GeneratableDateRangePreset,
  parseDateRange,
  clampDateRange,
} from "../utils/date-range";

/** What is currently selected: a preset, or a hand-picked range. */
export type TrendRangeSelection = GeneratableDateRangePreset | "custom";

export interface TrendRangePresetOption {
  id: GeneratableDateRangePreset;
  label: string;
}

/** Presets offered by default, shortest first. */
export const TREND_RANGE_PRESETS: readonly TrendRangePresetOption[] = [
  { id: "today", label: "Today" },
  { id: "last-7-days", label: "Last 7 days" },
  { id: "last-30-days", label: "Last 30 days" },
  { id: "this-month", label: "This month" },
  { id: "all", label: "All time" },
];

export interface UseTrendRangeOptions {
  /** Preset selected first. Defaults to "last-30-days". */
  initialPreset?: GeneratableDateRangePreset | undefined;
  /** Clock used when a preset is chosen. Defaults to the current time. */
  now?: (() => Date) | undefined;
}

export interface UseTrendRangeResult {
  range: DateRange;
  selection: TrendRangeSelection;
  /** Short label for the selection, e.g. "Last 7 days" or "2026-05-01 – 2026-05-10". */
  label: string;
  /** Label for the dates, e.g. "2026-05-01 – 2026-05-10", or "All time" when unbounded. */
  rangeLabel: string;
  isCustom: boolean;
  /** True when at most one end of the range is set. */
  isOpenEnded: boolean;
  /** `from` / `to` query parameters; unset bounds are omitted. */
  queryParams: Record<string, string>;
  presets: readonly TrendRangePresetOption[];
  selectPreset: (preset: GeneratableDateRangePreset) => void;
  /** Select a custom range. Invalid dates are dropped and an inverted range is corrected. */
  setCustomRange: (range: { from?: string | null | undefined; to?: string | null | undefined }) => void;
  /** Return to the initial preset. */
  reset: () => void;
}

interface State {
  selection: TrendRangeSelection;
  range: DateRange;
}

function presetLabel(preset: GeneratableDateRangePreset): string {
  return TREND_RANGE_PRESETS.find((option) => option.id === preset)?.label ?? preset;
}

export function useTrendRange(options: UseTrendRangeOptions = {}): UseTrendRangeResult {
  const { initialPreset = "last-30-days", now } = options;
  const readNow = now ?? defaultNow;

  const [state, setState] = useState<State>(() => ({
    selection: initialPreset,
    range: createPresetRange(initialPreset, readNow()),
  }));

  const selectPreset = useCallback(
    (preset: GeneratableDateRangePreset) => {
      setState({ selection: preset, range: createPresetRange(preset, readNow()) });
    },
    // `readNow` is either the stable default or the caller's `now`.
    [readNow],
  );

  const setCustomRange = useCallback(
    (range: { from?: string | null | undefined; to?: string | null | undefined }) => {
      const parsed = clampDateRange(
        parseDateRange({ from: range.from ?? undefined, to: range.to ?? undefined }),
        { from: null, to: null },
      );
      setState({
        selection: parsed.from === null && parsed.to === null ? "all" : "custom",
        range: parsed,
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ selection: initialPreset, range: createPresetRange(initialPreset, readNow()) });
  }, [initialPreset, readNow]);

  return useMemo(() => {
    const { range, selection } = state;
    const queryParams: Record<string, string> = {};
    if (range.from !== null) queryParams.from = range.from;
    if (range.to !== null) queryParams.to = range.to;
    const rangeLabel = formatDateRangeLabel(range);

    return {
      range,
      selection,
      label: selection === "custom" ? rangeLabel : presetLabel(selection),
      rangeLabel,
      isCustom: selection === "custom",
      isOpenEnded: range.from === null || range.to === null,
      queryParams,
      presets: TREND_RANGE_PRESETS,
      selectPreset,
      setCustomRange,
      reset,
    };
  }, [state, selectPreset, setCustomRange, reset]);
}

function defaultNow(): Date {
  return new Date();
}
