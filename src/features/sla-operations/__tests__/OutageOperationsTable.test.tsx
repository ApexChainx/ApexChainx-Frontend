/** ApexChain Frontend Test Suite */
/** Issue #1026 — outage operations table loading, empty, populated and sorting states. */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  OutageOperationsTable,
  type OutageOperationRow,
} from "@/features/sla-operations/components/OutageOperationsTable";

const rows: OutageOperationRow[] = [
  {
    id: "o1",
    service: "Payments API",
    severity: "high",
    status: "open",
    startedAt: "2026-05-03T10:00:00Z",
    durationMinutes: 120,
  },
  {
    id: "o2",
    service: "Ledger Sync",
    severity: "critical",
    status: "resolved",
    startedAt: "2026-05-01T09:00:00Z",
    durationMinutes: 9,
  },
  {
    id: "o3",
    service: "Anchor Bridge",
    severity: "low",
    status: "investigating",
    startedAt: "2026-05-02T12:00:00Z",
    durationMinutes: 100,
  },
];

/** Services of the rendered body rows, top to bottom. */
function renderedServices(): string[] {
  const [, ...bodyRows] = screen.getAllByRole("row");
  return bodyRows.map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");
}

function sortState(label: string): string | null {
  return screen.getByRole("columnheader", { name: label }).getAttribute("aria-sort");
}

function clickHeader(label: string): void {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("OutageOperationsTable states (#1026)", () => {
  it("shows a polite status message while loading and hides the table", () => {
    render(<OutageOperationsTable rows={rows} isLoading />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading outage operations...");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error as an alert and hides the table", () => {
    render(<OutageOperationsTable rows={rows} error="Could not load outages." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load outages.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("prefers the loading state over an error", () => {
    render(<OutageOperationsTable rows={rows} isLoading error="Could not load outages." />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an empty message when there are no rows", () => {
    render(<OutageOperationsTable rows={[]} />);

    expect(screen.getByText("No outage operations found.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the default empty state when rows are omitted", () => {
    render(<OutageOperationsTable rows={[]} isLoading={false} error={null} />);
    expect(screen.getByText("No outage operations found.")).toBeInTheDocument();
  });
});

describe("OutageOperationsTable rows (#1026)", () => {
  it("renders a labelled table with every column", () => {
    render(<OutageOperationsTable rows={rows} />);

    expect(screen.getByRole("table", { name: "Outage operations" })).toBeInTheDocument();
    expect(screen.getByRole("caption")).toHaveClass("sr-only");
    for (const header of ["Service", "Severity", "Status", "Started", "Duration (min)"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
  });

  it("renders one row per outage with every cell", () => {
    render(<OutageOperationsTable rows={rows} />);

    const [, first] = screen.getAllByRole("row");
    expect(within(first!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Payments API",
      "high",
      "open",
      "2026-05-03T10:00:00Z",
      "120",
    ]);
  });

  it("renders a single row without a header mismatch", () => {
    render(<OutageOperationsTable rows={[rows[1]!]} />);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(renderedServices()).toEqual(["Ledger Sync"]);
  });
});

describe("OutageOperationsTable sorting (#1026)", () => {
  it("sorts by start time, newest first, by default", () => {
    render(<OutageOperationsTable rows={rows} />);

    expect(renderedServices()).toEqual(["Payments API", "Anchor Bridge", "Ledger Sync"]);
    expect(sortState("Started")).toBe("descending");
    expect(sortState("Service")).toBe("none");
    expect(sortState("Severity")).toBe("none");
  });

  it("toggles the current column between ascending and descending", () => {
    render(<OutageOperationsTable rows={rows} />);

    clickHeader("Started");
    expect(renderedServices()).toEqual(["Ledger Sync", "Anchor Bridge", "Payments API"]);
    expect(sortState("Started")).toBe("ascending");

    clickHeader("Started");
    expect(renderedServices()).toEqual(["Payments API", "Anchor Bridge", "Ledger Sync"]);
    expect(sortState("Started")).toBe("descending");
  });

  it("sorts a newly selected column ascending and moves aria-sort", () => {
    render(<OutageOperationsTable rows={rows} />);

    clickHeader("Service");
    expect(renderedServices()).toEqual(["Anchor Bridge", "Ledger Sync", "Payments API"]);
    expect(sortState("Service")).toBe("ascending");
    expect(sortState("Started")).toBe("none");

    clickHeader("Service");
    expect(renderedServices()).toEqual(["Payments API", "Ledger Sync", "Anchor Bridge"]);
    expect(sortState("Service")).toBe("descending");
  });

  it("sorts duration numerically rather than as text", () => {
    render(<OutageOperationsTable rows={rows} />);

    clickHeader("Duration (min)");
    expect(renderedServices()).toEqual(["Ledger Sync", "Anchor Bridge", "Payments API"]);
    expect(sortState("Duration (min)")).toBe("ascending");

    clickHeader("Duration (min)");
    expect(renderedServices()).toEqual(["Payments API", "Anchor Bridge", "Ledger Sync"]);
  });

  it("sorts severity and status lexicographically", () => {
    render(<OutageOperationsTable rows={rows} />);

    clickHeader("Severity");
    expect(renderedServices()).toEqual(["Ledger Sync", "Payments API", "Anchor Bridge"]);

    clickHeader("Status");
    expect(renderedServices()).toEqual(["Anchor Bridge", "Payments API", "Ledger Sync"]);
  });

  it("does not mutate the rows it is given", () => {
    const input = [...rows];
    render(<OutageOperationsTable rows={input} />);

    clickHeader("Service");
    expect(input.map((row) => row.id)).toEqual(["o1", "o2", "o3"]);
  });
});
