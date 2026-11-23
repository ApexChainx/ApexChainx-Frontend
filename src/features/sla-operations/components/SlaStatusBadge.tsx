import {
  getSlaStatusPresentation,
  type SlaSemanticState,
} from "../utils/sla-status";

export interface SlaStatusBadgeProps {
  status?: string | null;
  className?: string;
}

const STATE_STYLES: Record<SlaSemanticState, string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
  danger: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  neutral: "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export function SlaStatusBadge({
  status,
  className = "",
}: SlaStatusBadgeProps) {
  const presentation = getSlaStatusPresentation(status);

  return (
    <span
      role="status"
      aria-label={`SLA status: ${presentation.label}`}
      data-sla-outcome={presentation.outcome}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATE_STYLES[presentation.state]} ${className}`.trim()}
    >
      {presentation.label}
    </span>
  );
}

export default SlaStatusBadge;
