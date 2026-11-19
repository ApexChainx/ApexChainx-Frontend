/** ApexChain Frontend Test Suite */
/** Issue #955 — bulk import column mapping form and validation. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BulkImportMappingForm,
  suggestBulkImportMapping,
  validateBulkImportMapping,
} from "@/features/sla-operations/components/forms/BulkImportMappingForm";

const HEADERS = ["Service ID", "Start Time", "end-time", "Severity", "Notes"];

function field(name: RegExp): HTMLSelectElement {
  return screen.getByLabelText(name) as HTMLSelectElement;
}

describe("suggestBulkImportMapping (#955)", () => {
  it("matches headers to fields ignoring case, spaces and dashes", () => {
    expect(suggestBulkImportMapping(HEADERS)).toEqual({
      service_id: "Service ID",
      start_time: "Start Time",
      end_time: "end-time",
      severity: "Severity",
    });
  });

  it("returns an empty mapping when nothing matches", () => {
    expect(suggestBulkImportMapping(["a", "b"])).toEqual({});
    expect(suggestBulkImportMapping([])).toEqual({});
  });

  it("uses each header for one field only", () => {
    expect(suggestBulkImportMapping(["status", "Status"])).toEqual({ status: "status" });
  });
});

describe("validateBulkImportMapping (#955)", () => {
  const headers = ["a", "b", "c"];

  it("accepts a complete mapping", () => {
    expect(
      validateBulkImportMapping({ service_id: "a", start_time: "b", end_time: "c" }, headers),
    ).toEqual({});
  });

  it("requires the three required fields", () => {
    const errors = validateBulkImportMapping({}, headers);
    expect(Object.keys(errors).sort()).toEqual(["end_time", "service_id", "start_time"]);
    expect(errors.service_id).toMatch(/required/i);
  });

  it("treats an empty selection as unmapped", () => {
    const errors = validateBulkImportMapping(
      { service_id: "a", start_time: "", end_time: "c" },
      headers,
    );
    expect(Object.keys(errors)).toEqual(["start_time"]);
  });

  it("rejects columns that are not in the file", () => {
    const errors = validateBulkImportMapping(
      { service_id: "a", start_time: "b", end_time: "zzz" },
      headers,
    );
    expect(errors.end_time).toContain("zzz");
  });

  it("rejects one column feeding two fields, reporting it on the later field", () => {
    const errors = validateBulkImportMapping(
      { service_id: "a", start_time: "a", end_time: "c" },
      headers,
    );
    expect(Object.keys(errors)).toEqual(["start_time"]);
    expect(errors.start_time).toContain("Service ID");
  });

  it("does not require optional fields", () => {
    expect(
      validateBulkImportMapping(
        { service_id: "a", start_time: "b", end_time: "c", severity: "" },
        headers,
      ),
    ).toEqual({});
  });
});

describe("BulkImportMappingForm (#955)", () => {
  it("prefills the suggested mapping and shows every column as an option", () => {
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={vi.fn()} />);

    expect(field(/^Service ID/).value).toBe("Service ID");
    expect(field(/^Start time/).value).toBe("Start Time");
    expect(field(/^End time/).value).toBe("end-time");
    expect(field(/^Status/).value).toBe("");
    expect(field(/^Severity/).querySelectorAll("option")).toHaveLength(HEADERS.length + 1);
  });

  it("uses initialMapping instead of suggestions when provided", () => {
    render(
      <BulkImportMappingForm
        sourceHeaders={HEADERS}
        initialMapping={{ service_id: "Notes" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(field(/^Service ID/).value).toBe("Notes");
    expect(field(/^Start time/).value).toBe("");
  });

  it("labels required fields for assistive technology", () => {
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/^Service ID/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/^Severity/)).toHaveAttribute("aria-required", "false");
    expect(screen.getAllByText("(required)", { exact: false }).length).toBeGreaterThanOrEqual(3);
  });

  it("submits the compact mapping with the default options", () => {
    const onSubmit = vi.fn();
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      mapping: {
        service_id: "Service ID",
        start_time: "Start Time",
        end_time: "end-time",
        severity: "Severity",
      },
      onDuplicate: "skip",
      dryRun: true,
    });
  });

  it("submits changed options", () => {
    const onSubmit = vi.fn();
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={onSubmit} />);

    fireEvent.change(field(/^Severity/), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("Update"));
    fireEvent.click(screen.getByLabelText("Dry run"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledWith({
      mapping: { service_id: "Service ID", start_time: "Start Time", end_time: "end-time" },
      onDuplicate: "update",
      dryRun: false,
    });
  });

  it("blocks submit and explains each missing required field", () => {
    const onSubmit = vi.fn();
    render(<BulkImportMappingForm sourceHeaders={["a", "b"]} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("3 fields need attention.")).toBeInTheDocument();
    const serviceId = field(/^Service ID/);
    expect(serviceId).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(serviceId.getAttribute("aria-describedby") ?? "")).toHaveTextContent(
      /Service ID is required/,
    );
  });

  it("clears an error as soon as the field is fixed", () => {
    render(<BulkImportMappingForm sourceHeaders={["a", "b", "c"]} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("3 fields need attention.")).toBeInTheDocument();

    fireEvent.change(field(/^Service ID/), { target: { value: "a" } });
    expect(screen.getByText("2 fields need attention.")).toBeInTheDocument();
    expect(field(/^Service ID/)).not.toHaveAttribute("aria-invalid");
  });

  it("flags a column used twice", () => {
    const onSubmit = vi.fn();
    render(
      <BulkImportMappingForm
        sourceHeaders={["a", "b"]}
        initialMapping={{ service_id: "a", start_time: "a", end_time: "b" }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("1 field needs attention.")).toBeInTheDocument();
    expect(screen.getByText(/already used for Service ID/)).toBeInTheDocument();
  });

  it("tells the operator when the file has no columns and disables the form", () => {
    render(<BulkImportMappingForm sourceHeaders={[]} onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/No columns were found/);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(field(/^Service ID/)).toBeDisabled();
  });

  it("supports a custom submit label and a cancel action", () => {
    const onCancel = vi.fn();
    render(
      <BulkImportMappingForm
        sourceHeaders={HEADERS}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        submitLabel="Preview import"
      />,
    );
    expect(screen.getByRole("button", { name: "Preview import" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders no cancel button without a handler", () => {
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("exposes a labelled form and grouped controls", () => {
    render(<BulkImportMappingForm sourceHeaders={HEADERS} onSubmit={vi.fn()} />);
    expect(screen.getByRole("form", { name: "Bulk import column mapping" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Map columns" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "When a row matches an existing outage" }),
    ).toBeInTheDocument();
  });
});
