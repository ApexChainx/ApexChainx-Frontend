import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "@/components/CommandPalette";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/outages/OUT-001",
  useRouter: () => ({ push: mockPush }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("opens with keyboard shortcut and executes a matching action", () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type a command or search/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/type a command or search/i), {
      target: { value: "payments" },
    });

    fireEvent.keyDown(window, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/payments");
  });

  it("shows outage-specific resolve action for the current route", () => {
    render(<CommandPalette />);

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    expect(screen.getByText(/resolve OUT-001/i)).toBeInTheDocument();
  });
});
