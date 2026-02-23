import React, { useRef, useState, useEffect } from "react";
import { exportOutages } from "../../services/exportService";
import { ExportFormat, OutageExportFilters } from "../../types/export";

interface ExportDropdownProps {
  filters?: OutageExportFilters;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ filters = {} }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setOpen(false);
    setLoading(format);
    setError(null);
    try {
      await exportOutages(format, filters);
    } catch {
      setError(`Failed to export as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => !isLoading && setOpen((o) => !o)}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
              />
            </svg>
            Exporting {loading!.toUpperCase()}...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3"
              />
            </svg>
            Export
            <svg
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {(["csv", "json"] as ExportFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-semibold uppercase text-gray-500">
                {format}
              </span>
              Export as {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="absolute left-0 mt-1 w-64 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 shadow">
          {error}
        </p>
      )}
    </div>
  );
};

export default ExportDropdown;
