export interface RecentOperation {
  id: string;
  title: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  status?: string;
}

export interface RecentOperationsFeedProps {
  operations?: RecentOperation[];
  isLoading?: boolean;
  error?: string | null;
  /** Maximum number of items shown. */
  limit?: number;
}

export function RecentOperationsFeed({
  operations = [],
  isLoading = false,
  error = null,
  limit = 10,
}: RecentOperationsFeedProps) {
  let body;
  if (isLoading) {
    body = <p role="status">Loading recent operations...</p>;
  } else if (error) {
    body = <p role="alert">{error}</p>;
  } else if (operations.length === 0) {
    body = <p>No recent operations.</p>;
  } else {
    body = (
      <ul className="divide-y">
        {operations.slice(0, limit).map((op) => {
          const date = new Date(op.timestamp);
          const valid = !Number.isNaN(date.getTime());
          return (
            <li key={op.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-medium">{op.title}</span>
              {op.status ? <span className="text-sm text-gray-600">{op.status}</span> : null}
              <time dateTime={valid ? op.timestamp : undefined} className="text-sm text-gray-500">
                {valid ? date.toLocaleString() : "Unknown time"}
              </time>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <section aria-label="Recent operations" className="rounded-lg border p-4">
      {body}
    </section>
  );
}
