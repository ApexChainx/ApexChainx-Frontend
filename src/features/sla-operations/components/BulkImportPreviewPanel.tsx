/** ApexChain Network Operations Intelligence Platform */
import type { BulkImportPreview } from "../types/bulk-import-preview";

export interface BulkImportPreviewPanelProps {
  preview: BulkImportPreview | null;
  isLoading?: boolean;
  error?: string | null;
}

export function BulkImportPreviewPanel({
  preview,
  isLoading = false,
  error = null,
}: BulkImportPreviewPanelProps) {
  const headingId = "bulk-import-preview-heading";

  return (
    <section aria-labelledby={headingId} aria-busy={isLoading} className="rounded-lg border p-4">
      <h2 id={headingId} className="text-lg font-semibold">
        Bulk import preview
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">
          Loading import preview...
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : !preview || preview.rows.length === 0 ? (
        <p className="mt-3 text-sm">No import rows to preview.</p>
      ) : (
        <>
          <p className="mt-2 text-sm">
            {preview.fileName}: {preview.summary.totalRows} rows, {preview.summary.validRows} valid,{" "}
            {preview.summary.invalidRows} invalid, {preview.summary.warningRows} with warnings,{" "}
            {preview.summary.errorCount} errors
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Import rows for {preview.fileName}</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-1 pr-3">Row</th>
                  <th scope="col" className="py-1 pr-3">Status</th>
                  {preview.headers.map((h) => (
                    <th key={h} scope="col" className="py-1 pr-3">{h}</th>
                  ))}
                  <th scope="col" className="py-1">Findings</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t align-top">
                    <td className="py-1 pr-3">{row.rowNumber}</td>
                    <td className="py-1 pr-3">{row.status}</td>
                    {preview.headers.map((h) => (
                      <td key={h} className="py-1 pr-3">{row.values[h] ?? ""}</td>
                    ))}
                    <td className="py-1">
                      {row.issues.length === 0 ? (
                        "-"
                      ) : (
                        <ul>
                          {row.issues.map((issue, i) => (
                            <li key={`${issue.field}-${i}`}>
                              {issue.severity}: {issue.field} - {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
