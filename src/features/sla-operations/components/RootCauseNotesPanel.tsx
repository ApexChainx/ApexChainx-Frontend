/** ApexChain Network Operations Intelligence Platform */

/** Local minimal note shape (no shared root-cause type exists yet). */
export interface RootCauseNote {
  id: string;
  kind: "root_cause" | "resolution";
  body: string;
  author?: string;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface RootCauseNotesPanelProps {
  notes: RootCauseNote[];
  isLoading?: boolean;
  error?: string | null;
}

const KIND_LABELS: Record<RootCauseNote["kind"], string> = {
  root_cause: "Root cause",
  resolution: "Resolution",
};

/** Panel listing root-cause and resolution notes, grouped by kind. */
export function RootCauseNotesPanel({
  notes,
  isLoading = false,
  error = null,
}: RootCauseNotesPanelProps) {
  return (
    <section aria-labelledby="root-cause-notes-heading" className="rounded-lg border p-4">
      <h2 id="root-cause-notes-heading" className="mb-3 text-lg font-semibold">
        Root cause notes
      </h2>
      {isLoading ? (
        <p role="status">Loading notes...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : notes.length === 0 ? (
        <p>No root cause or resolution notes yet.</p>
      ) : (
        (["root_cause", "resolution"] as const).map((kind) => {
          const group = notes.filter((n) => n.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} className="mb-3">
              <h3 className="font-medium">{KIND_LABELS[kind]}</h3>
              <ul className="space-y-2">
                {group.map((note) => (
                  <li key={note.id} className="text-sm">
                    <p className="whitespace-pre-wrap">{note.body}</p>
                    <p className="text-xs opacity-70">
                      {note.author ? `${note.author} - ` : ""}
                      <time dateTime={note.createdAt}>
                        {Number.isNaN(Date.parse(note.createdAt))
                          ? note.createdAt
                          : new Date(note.createdAt).toLocaleString()}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

export default RootCauseNotesPanel;
