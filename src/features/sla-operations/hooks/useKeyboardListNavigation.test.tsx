/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen } from "@testing-library/react";
import { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  KEYBOARD_LIST_INDEX_ATTR,
  useKeyboardListNavigation,
} from "@/features/sla-operations/hooks/useKeyboardListNavigation";

const SITES = ["Nairobi Core", "Mombasa Edge", "Kisumu Relay", "Eldoret Hub"];

interface DemoListProps {
  itemCount?: number;
  orientation?: "vertical" | "horizontal";
  loop?: boolean;
  disabled?: boolean;
  onActivate?: (index: number) => void;
  onEscape?: () => void;
}

function DemoList({
  itemCount = SITES.length,
  orientation,
  loop,
  disabled,
  onActivate,
  onEscape,
}: DemoListProps) {
  const nav = useKeyboardListNavigation<HTMLUListElement>({
    itemCount,
    orientation,
    loop,
    disabled,
    onActivate,
    onEscape,
  });

  return (
    <ul {...nav.containerProps} role="listbox" aria-label="Outages">
      {SITES.slice(0, itemCount).map((site, index) => (
        <li
          key={site}
          {...nav.getItemProps(index)}
          role="option"
          aria-selected={index === nav.activeIndex}
          data-testid={`item-${index}`}
        >
          {site}
        </li>
      ))}
    </ul>
  );
}

/** Mirrors a live filter narrowing the list after the list has been navigated. */
function ShrinkingList() {
  const [itemCount, setItemCount] = useState(SITES.length);
  const nav = useKeyboardListNavigation<HTMLUListElement>({ itemCount });

  return (
    <div>
      <button type="button" onClick={() => setItemCount(2)}>
        narrow
      </button>
      <ul {...nav.containerProps} role="listbox" aria-label="Outages">
        {SITES.slice(0, itemCount).map((site, index) => (
          <li key={site} {...nav.getItemProps(index)} role="option">
            {site}
          </li>
        ))}
      </ul>
    </div>
  );
}

function tabIndexOf(index: number) {
  return screen.getByTestId(`item-${index}`).getAttribute("tabindex");
}

/** Focuses an element inside `act` so the hook's onFocus state update is flushed. */
function focusElement(element: HTMLElement) {
  act(() => element.focus());
  return element;
}

describe("useKeyboardListNavigation", () => {
  it("moves the tab stop and focus with the vertical arrow keys", () => {
    render(<DemoList />);

    expect(tabIndexOf(0)).toBe("0");
    expect(tabIndexOf(1)).toBe("-1");

    focusElement(screen.getByTestId("item-0"));
    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "ArrowDown" });

    expect(document.activeElement).toBe(screen.getByTestId("item-1"));
    expect(tabIndexOf(1)).toBe("0");
    expect(tabIndexOf(0)).toBe("-1");

    fireEvent.keyDown(screen.getByTestId("item-1"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));
    expect(tabIndexOf(0)).toBe("0");
  });

  it("clamps at the list bounds unless loop is enabled", () => {
    const { rerender } = render(<DemoList />);

    focusElement(screen.getByTestId("item-3"));
    fireEvent.keyDown(screen.getByTestId("item-3"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("item-3"));

    fireEvent.keyDown(screen.getByTestId("item-3"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByTestId("item-2"));

    rerender(<DemoList loop />);
    focusElement(screen.getByTestId("item-3"));
    fireEvent.keyDown(screen.getByTestId("item-3"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));

    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByTestId("item-3"));
  });

  it("supports Home and End", () => {
    render(<DemoList />);

    focusElement(screen.getByTestId("item-1"));
    fireEvent.keyDown(screen.getByTestId("item-1"), { key: "End" });
    expect(document.activeElement).toBe(screen.getByTestId("item-3"));

    fireEvent.keyDown(screen.getByTestId("item-3"), { key: "Home" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));
  });

  it("uses horizontal arrows for a horizontal list", () => {
    render(<DemoList orientation="horizontal" />);

    focusElement(screen.getByTestId("item-0"));
    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));

    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByTestId("item-1"));

    fireEvent.keyDown(screen.getByTestId("item-1"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));
  });

  it("activates the focused item on Enter and Space", () => {
    const onActivate = vi.fn();
    render(<DemoList onActivate={onActivate} />);

    focusElement(screen.getByTestId("item-2"));
    fireEvent.keyDown(screen.getByTestId("item-2"), { key: "Enter" });
    expect(onActivate).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(screen.getByTestId("item-2"), { key: " " });
    expect(onActivate).toHaveBeenLastCalledWith(2);
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("calls onEscape on Escape", () => {
    const onEscape = vi.fn();
    render(<DemoList onEscape={onEscape} />);

    focusElement(screen.getByTestId("item-1"));
    fireEvent.keyDown(screen.getByTestId("item-1"), { key: "Escape" });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByTestId("item-1"));
  });

  it("does not navigate while disabled", () => {
    const onActivate = vi.fn();
    render(<DemoList disabled onActivate={onActivate} />);

    focusElement(screen.getByTestId("item-0"));
    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("item-0"));
    expect(tabIndexOf(1)).toBe("-1");

    fireEvent.keyDown(screen.getByTestId("item-0"), { key: "Enter" });
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("ignores keys typed into in-cell editors", () => {
    function ListWithEditor() {
      const nav = useKeyboardListNavigation<HTMLUListElement>({
        itemCount: 1,
      });

      return (
        <ul {...nav.containerProps} role="listbox" aria-label="Outages">
          <li {...nav.getItemProps(0)} role="option">
            <input aria-label="Site note" />
          </li>
        </ul>
      );
    }

    render(<ListWithEditor />);

    const input = screen.getByLabelText("Site note");
    focusElement(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(document.activeElement).toBe(input);
  });

  it("clamps the tab stop when the list shrinks", () => {
    render(<ShrinkingList />);

    const items = screen.getAllByRole("option");
    focusElement(items[3]);
    expect(items[3].getAttribute("tabindex")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "narrow" }));

    const remaining = screen.getAllByRole("option");
    expect(remaining).toHaveLength(2);
    // The tab stop is clamped to the new last item, not reset to the first.
    expect(remaining[1].getAttribute("tabindex")).toBe("0");
    expect(remaining[0].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(remaining[0], { key: "End" });
    expect(document.activeElement).toBe(remaining[1]);
  });

  it("handles an empty list without throwing", () => {
    render(<DemoList itemCount={0} />);

    const list = screen.getByRole("listbox");
    expect(() => fireEvent.keyDown(list, { key: "ArrowDown" })).not.toThrow();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("exposes the item attributes documented for consumers", () => {
    render(<DemoList />);

    const item = screen.getByTestId("item-0");
    expect(item.getAttribute("data-keyboard-list-item")).toBe("true");
    expect(item.getAttribute(KEYBOARD_LIST_INDEX_ATTR)).toBe("0");
    expect(item.getAttribute("aria-selected")).toBe("true");
  });
});
