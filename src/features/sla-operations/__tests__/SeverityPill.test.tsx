/** ApexChain Frontend Test Suite */
/** Issue #978 — severity pill rendering, normalisation and accessibility. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeverityPill } from "@/features/sla-operations/components/SeverityPill";

describe("SeverityPill (#978)", () => {
  it.each([
    ["low", "Low"],
    ["medium", "Medium"],
    ["high", "High"],
    ["critical", "Critical"],
  ])("renders %s as %s", (severity, label) => {
    const { container } = render(<SeverityPill severity={severity} />);
    const pill = container.firstElementChild;
    expect(pill).toHaveAttribute("data-severity", severity);
    expect(pill).toHaveTextContent(label);
  });

  it("normalises backend aliases and casing", () => {
    const { container } = render(<SeverityPill severity=" URGENT " />);
    expect(container.firstElementChild).toHaveAttribute("data-severity", "critical");
    expect(container.firstElementChild).toHaveTextContent("Critical");
  });

  it("renders Unknown for nullish and unrecognised values", () => {
    for (const severity of [null, undefined, "", "banana"]) {
      const { container, unmount } = render(<SeverityPill severity={severity} />);
      expect(container.firstElementChild).toHaveAttribute("data-severity", "unknown");
      expect(container.firstElementChild).toHaveTextContent("Unknown");
      unmount();
    }
  });

  it("prefixes the text for screen readers", () => {
    render(<SeverityPill severity="high" />);
    expect(screen.getByText("Severity:")).toHaveClass("sr-only");
  });

  it("can omit the accessible prefix", () => {
    render(<SeverityPill severity="high" hideAccessiblePrefix />);
    expect(screen.queryByText("Severity:")).not.toBeInTheDocument();
  });

  it("hides the decorative glyph from assistive technology", () => {
    render(<SeverityPill severity="critical" />);
    expect(screen.getByText("▲")).toHaveAttribute("aria-hidden", "true");
  });

  it("allows a custom label and size", () => {
    const { container } = render(<SeverityPill severity="low" label="Sev 3" size="md" />);
    expect(container.firstElementChild).toHaveTextContent("Sev 3");
    expect(container.firstElementChild).toHaveClass("text-sm");
  });

  it("merges extra class names", () => {
    const { container } = render(<SeverityPill severity="low" className="ml-2" />);
    expect(container.firstElementChild).toHaveClass("ml-2");
  });
});
