/** ApexChain Network Operations Intelligence Platform */
import type { KpiCardModel } from "../types/kpi";

export interface KpiOverviewGridProps {
  cards: KpiCardModel[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
}

const ARROW = { up: "▲", down: "▼", flat: "▬" } as const;

export function KpiOverviewGrid({
  cards,
  isLoading = false,
  error = null,
  title = "KPI overview",
}: KpiOverviewGridProps) {
  const headingId = "kpi-overview-heading";

  return (
    <section aria-labelledby={headingId} aria-busy={isLoading}>
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">
          Loading KPIs...
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : cards.length === 0 ? (
        <p className="mt-3 text-sm">No KPIs available.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li key={card.id} data-state={card.state} className="rounded-lg border p-4">
              <p className="text-sm">{card.label}</p>
              <p className="text-2xl font-semibold">
                {card.displayValue}
                {card.unit ? <span className="ml-1 text-sm">{card.unit}</span> : null}
              </p>
              {card.delta ? (
                <p className="text-xs">
                  <span aria-hidden="true">{ARROW[card.delta.direction]}</span>{" "}
                  <span className="sr-only">{card.delta.direction}: </span>
                  {card.delta.value}
                  {card.delta.comparisonLabel ? ` ${card.delta.comparisonLabel}` : ""}
                </p>
              ) : null}
              {card.helperText ? <p className="text-xs">{card.helperText}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
