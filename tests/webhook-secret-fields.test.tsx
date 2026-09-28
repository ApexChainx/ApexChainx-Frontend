/** ApexChain Frontend Test Suite */
/**
 * Issue #600 — the signing-secret field had a plain Show/Hide button with no
 * announced pressed state, no label association, and a `navigator.clipboard`
 * call that failed silently in non-secure contexts. These tests pin the
 * accessible contract (labelled field, toggle that announces its state) and
 * the copy contract (writes the secret, reports success, falls back when the
 * async clipboard API is denied).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WebhookSettings from "@/components/settings/webhook-settings";

const SECRET = "0123456789abcdef0123456789abcdef";

const writeText = vi.fn();

function renderSettings(secret: string = SECRET) {
  return render(
    <WebhookSettings
      initialConfig={{ url: "https://example.com/hook", secret, events: [] }}
    />,
  );
}

describe("WebhookSettings secret field (#600)", () => {
  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("labels the secret field and masks it until revealed", () => {
    renderSettings();

    const field = screen.getByLabelText("Signing Secret") as HTMLInputElement;
    expect(field).toHaveAttribute("type", "password");
    // Masked, not the raw secret.
    expect(field.value).not.toBe(SECRET);
  });

  it("exposes a reveal toggle that announces its pressed state", () => {
    renderSettings();

    const toggle = screen.getByRole("button", { name: "Show signing secret" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    const revealed = screen.getByRole("button", { name: "Hide signing secret" });
    expect(revealed).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Signing Secret")).toHaveValue(SECRET);
  });

  it("copies the secret and announces the confirmation", async () => {
    writeText.mockResolvedValue(undefined);
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Copy signing secret to clipboard" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SECRET));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/copied to clipboard/i),
    );
  });

  it("falls back to the legacy copy path when the clipboard API is denied", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Copy signing secret to clipboard" }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/copied to clipboard/i),
    );
  });

  it("reports a failure when neither copy path works", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Copy signing secret to clipboard" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/could not copy/i),
    );
  });
});
