/** ApexChain Frontend Test Suite */
/** Issue #1023 — operations filter interactions and callbacks. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OperationsFilterBar } from "@/features/sla-operations/components/OperationsFilterBar";
import type { OperationsFilterState } from "@/features/sla-operations/types/filters";

const initialState: OperationsFilterState = {
  search: "",
  dateRange: { from: "2026-01-01", to: "2026-01-31" },
  severities: [],
  statuses: [],
  sort: { field: "createdAt", direction: "desc" },
};

const severityOptions = [
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "breached", label: "Breached" },
];

describe("OperationsFilterBar (#1023)", () => {
  it("renders labeled search and date controls and optional filter selects", () => {
    render(
      <OperationsFilterBar
        value={initialState}
        onChange={vi.fn()}
        severityOptions={severityOptions}
        statusOptions={statusOptions}
      />,
    );

    expect(screen.getByRole("search", { name: "Operations filters" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveAttribute("type", "search");
    expect(screen.getByLabelText("From")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-01-31");
    expect(screen.getByLabelText("Severity")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("updates search while preserving the other filter state", () => {
    const onChange = vi.fn();
    render(
      <OperationsFilterBar
        value={{ ...initialState, severities: ["high"] }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "outage" },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      ...initialState,
      search: "outage",
      severities: ["high"],
    });
  });

  it("updates one date bound and preserves the other bound", () => {
    const onChange = vi.fn();
    render(<OperationsFilterBar value={initialState} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-02-01" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...initialState,
      dateRange: { from: "2026-02-01", to: "2026-01-31" },
    });
  });

  it("converts cleared date bounds to undefined", () => {
    const onChange = vi.fn();
    render(<OperationsFilterBar value={initialState} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith({
      ...initialState,
      dateRange: { from: undefined, to: "2026-01-31" },
    });
  });

  it("updates selected severity and status values", () => {
    const onChange = vi.fn();
    render(
      <OperationsFilterBar
        value={initialState}
        onChange={onChange}
        severityOptions={severityOptions}
        statusOptions={statusOptions}
      />,
    );

    fireEvent.change(screen.getByLabelText("Severity"), {
      target: { value: "critical" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...initialState,
      severities: ["critical"],
    });

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "breached" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...initialState,
      statuses: ["breached"],
    });
  });

  it("clears every filter and preserves the current sort descriptor", () => {
    const onChange = vi.fn();
    render(
      <OperationsFilterBar
        value={{
          ...initialState,
          search: "outage",
          severities: ["high"],
          statuses: ["pending"],
        }}
        onChange={onChange}
        severityOptions={severityOptions}
        statusOptions={statusOptions}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith({
      dateRange: {},
      severities: [],
      statuses: [],
      sort: initialState.sort,
    });
  });

  it("disables controls when requested and hides empty option groups", () => {
    render(
      <OperationsFilterBar
        value={{ dateRange: {}, severities: [], statuses: [] }}
        onChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText("Search")).toBeDisabled();
    expect(screen.getByLabelText("From")).toBeDisabled();
    expect(screen.getByLabelText("To")).toBeDisabled();
    expect(screen.queryByLabelText("Severity")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
  });
});
