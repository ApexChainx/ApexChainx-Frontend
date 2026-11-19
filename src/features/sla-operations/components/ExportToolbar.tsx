/** ApexChain Network Operations Intelligence Platform */
import type { ExportFormat } from "../types/export";

export interface ExportToolbarProps {
  /** Called with the chosen format; the parent performs the actual export. */
  onExport: (format: ExportFormat) => void;
  formats?: ExportFormat[];
  /** Disable when there is nothing to export. */
  disabled?: boolean;
  isExporting?: boolean;
  error?: string | null;
}

/** Toolbar with one button per export format. */
export function ExportToolbar({
  onExport,
  formats = ["csv", "json"],
  disabled = false,
  isExporting = false,
  error = null,
}: ExportToolbarProps) {
  const inactive = disabled || isExporting;
  return (
    <div role="toolbar" aria-label="Export options" className="flex flex-wrap items-center gap-2">
      {formats.length === 0 ? (
        <span>No export formats available.</span>
      ) : (
        formats.map((format) => (
          <button
            key={format}
            type="button"
            disabled={inactive}
            onClick={() => onExport(format)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : `Export ${format.toUpperCase()}`}
          </button>
        ))
      )}
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}

export default ExportToolbar;
