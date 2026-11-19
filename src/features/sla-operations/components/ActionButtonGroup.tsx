/** ApexChain Network Operations Intelligence Platform */
import type { ReactNode } from "react";

/** One action rendered in an `ActionButtonGroup`. */
export interface ActionButtonItem {
  id: string;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export interface ActionButtonGroupProps {
  actions: ReadonlyArray<ActionButtonItem>;
  /** Accessible name for the group. */
  label?: string;
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<ActionButtonItem["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

/** Grouped toolbar actions. Renders nothing when there are no actions. */
export function ActionButtonGroup({
  actions,
  label = "Actions",
  className = "",
}: ActionButtonGroupProps) {
  if (!actions || actions.length === 0) {
    return null;
  }
  return (
    <div role="group" aria-label={label} className={`inline-flex gap-2 ${className}`.trim()}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[action.variant ?? "secondary"]}`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default ActionButtonGroup;
