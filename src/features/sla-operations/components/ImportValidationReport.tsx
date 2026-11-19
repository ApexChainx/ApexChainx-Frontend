/** ApexChain Network Operations Intelligence Platform */
import type { ReactElement } from "react";
import type { BulkImportPreview } from "../types/bulk-import-preview";

export interface ImportValidationReportProps {
  preview: BulkImportPreview | null;
  isLoading?: boolean;
  error?: string | null;
}

/** Report of bulk import validation counts and the rows with errors. */
export function ImportValidationReport({
  preview,
  isLoading = false,
  error = null,
}: ImportValidationReportProps): ReactElement {
  const failing = preview?.rows.filter((r) => r.status === "invalid") ?? [];

  return (
    <section
      aria-labelledby="import-validation-heading"
      aria-busy={isLoading}
      className="rounded-lg border p-4"
    >
      <h2 id="import-validation-heading" className="text-base font-semibold">
        Import validation report
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">Loading validation report...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      ) : !preview || preview.summary.totalRows === 0 ? (
        <p className="mt-3 text-sm">No import rows to validate.</p>
      ) : (
        <>
          <p className="mt-1 text-xs break-all">{preview.fileName}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><dt className="text-xs">Total rows</dt><dd className="text-lg font-semibold">{preview.summary.totalRows}</dd></div>
            <div><dt className="text-xs">Valid</dt><dd className="text-lg font-semibold">{preview.summary.validRows}</dd></div>
            <div><dt className="text-xs">Invalid</dt><dd className="text-lg font-semibold">{preview.summary.invalidRows}</dd></div>
            <div><dt className="text-xs">Warnings</dt><dd className="text-lg font-semibold">{preview.summary.warningRows}</dd></div>
          </dl>
          {failing.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {failing.map((r) => (
                <li key={r.rowNumber}>
                  Row {r.rowNumber}: {r.issues.filter((i) => i.severity === "error").map((i) => `${i.field} - ${i.message}`).join("; ")}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default ImportValidationReport;
