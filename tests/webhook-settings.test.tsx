/** ApexChain Frontend Test Suite */
/**
 * Issue #602 — regenerating a webhook signing secret must not silently
 * invalidate the key downstream consumers verify against.
 *
 * These tests pin the two halves of that contract: generating a *first*
 * secret stays one click, while rotating an existing one is gated behind an
 * explicit confirmation (and leaves the current secret untouched until the
 * confirmation passes).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WebhookSettings, {
  REGENERATE_SECRET_PHRASE,
} from "@/components/settings/webhook-settings";

const EXISTING_SECRET = "0123456789abcdef0123456789abcdef";

const HEX_SECRET = /^[0-9a-f]{32,}$/;

function renderSettings(secret?: string) {
  return render(
    <WebhookSettings
      initialConfig={secret ? { url: "https://example.com/hook", secret, events: [] } : undefined}
    />,
  );
}

/** The secret input renders masked until the reveal toggle is clicked. */
function revealSecret(): HTMLInputElement {
  fireEvent.click(screen.getByRole("button", { name: "Show signing secret" }));
  return screen.getByLabelText("Signing Secret") as HTMLInputElement;
}

describe("WebhookSettings secret rotation (#602)", () => {
  it("generates a first secret without asking for confirmation", () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(revealSecret().value).toMatch(HEX_SECRET);
  });

  it("warns before rotating an existing secret and keeps it until confirmed", () => {
    renderSettings(EXISTING_SECRET);

    expect(revealSecret().value).toBe(EXISTING_SECRET);

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    // The dialog explains the blast radius and the grace-window guidance.
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/Regenerate signing secret\?/);
    expect(dialog).toHaveTextContent(/invalidates the current one/i);
    expect(dialog).toHaveTextContent(/grace window/i);

    // Opening the dialog alone must not rotate anything.
    expect(screen.getByLabelText("Signing Secret")).toHaveValue(EXISTING_SECRET);

    // Cancelling leaves the live secret in place.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Signing Secret")).toHaveValue(EXISTING_SECRET);
  });

  it("rotates only after the exact confirmation phrase is typed", () => {
    renderSettings(EXISTING_SECRET);
    revealSecret();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    const confirm = screen.getByRole("button", { name: "Regenerate secret" });
    expect(confirm).toBeDisabled();

    const phraseInput = screen.getByPlaceholderText(REGENERATE_SECRET_PHRASE);
    fireEvent.change(phraseInput, { target: { value: "regenerate" } });
    expect(confirm).toBeDisabled();

    fireEvent.change(phraseInput, { target: { value: REGENERATE_SECRET_PHRASE } });
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const rotated = screen.getByLabelText("Signing Secret") as HTMLInputElement;
    expect(rotated.value).not.toBe(EXISTING_SECRET);
    expect(rotated.value).toMatch(HEX_SECRET);
  });
});
