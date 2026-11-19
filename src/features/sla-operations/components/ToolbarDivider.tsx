export interface ToolbarDividerProps {
  /** Direction of the divider line. Defaults to "vertical" (for horizontal toolbars). */
  orientation?: "horizontal" | "vertical";
  /** Optional accessible label describing the group boundary. */
  label?: string;
  className?: string;
}

export function ToolbarDivider({
  orientation = "vertical",
  label,
  className = "",
}: ToolbarDividerProps) {
  const size = orientation === "vertical" ? "mx-2 h-6 w-px" : "my-2 h-px w-full";
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      className={`shrink-0 bg-gray-300 dark:bg-gray-700 ${size} ${className}`.trim()}
    />
  );
}

export default ToolbarDivider;
