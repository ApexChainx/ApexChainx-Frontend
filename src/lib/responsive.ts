/**
 * Responsive layout utilities for dashboard, outages, and payments views.
 * Provides Tailwind class helpers that enforce consistent narrow-viewport behaviour.
 */

/** Full-bleed scrollable wrapper for dense tables on small screens. */
export const tableScrollWrapper = "w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0";

/** Responsive grid for dashboard stat cards: 1 col → 2 col → 4 col. */
export const statCardGrid = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";

/** Stack filter controls vertically on mobile, row on sm+. */
export const filterBarLayout = "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center";

/** Drawer width: full on mobile, fixed sidebar on sm+. */
export const drawerWidth = "w-full sm:w-[420px]";

/** Clamp long text in table cells to prevent layout blowout. */
export const tableCellText = "max-w-[160px] truncate sm:max-w-none";

type Breakpoint = "sm" | "md" | "lg" | "xl";

const BREAKPOINTS: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/** Returns true when the viewport is narrower than the given breakpoint. */
export function isBelowBreakpoint(bp: Breakpoint): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < BREAKPOINTS[bp];
}

/** Joins class strings, filtering falsy values. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Returns responsive padding classes scaled by density. */
export function cellPadding(compact: boolean): string {
  return compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
}
