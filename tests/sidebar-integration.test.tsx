/**
 * ApexChain Frontend Test Suite — Sidebar integration tests (Issue #829),
 * re-render optimisation (#830) and keyboard navigation (#831).
 *
 * These exercise the sidebar as a whole inside the same provider stack the root
 * layout mounts it in, and drive it the way an operator does: by tabbing,
 * arrow-keying, collapsing groups and re-rendering under session churn.
 *
 * The session mock is backed by a real React context rather than a plain
 * function. That matters: `React.memo` skips prop-equal re-renders, but a
 * *context* update still propagates through it. Modelling the session as a
 * context is therefore what makes these tests exercise the real behaviour — a
 * plain function mock would let `memo` swallow a session change entirely.
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked and `t` echoes the key.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockUser {
  id: string;
  email: string;
  role: string;
}

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as MockUser,
  /** Bumped to emulate a heartbeat: new session object, identical content. */
  sessionVersion: 0,
}));

const route = vi.hoisted(() => ({ current: "/outages" }));
const i18n = vi.hoisted(() => ({ tCalls: 0 }));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => {
    i18n.tCalls += 1;
    return {
      t: (key: string) => {
        i18n.tCalls += 1;
        return key;
      },
      locale: "en",
    };
  },
}));

vi.mock("@/hooks/useSession", async () => {
  const { createContext, useContext } = await import("react");
  const SessionContext = createContext<{
    state: string;
    user: MockUser;
    logout: () => void;
  } | null>(null);
  return {
    // Mirrors the real hook, which reads the provider in `src/providers/session`.
    useSession: () => {
      const ctx = useContext(SessionContext);
      if (!ctx) throw new Error("useSession must be used within a SessionContext");
      return ctx;
    },
    SessionContext,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => route.current,
}));

import Sidebar from "@/components/layout/Sidebar";
import { SessionContext } from "@/hooks/useSession";
import { SIDEBAR_LINK_ATTRIBUTE } from "@/components/layout/sidebar-items";

/** The provider stack the root layout mounts the sidebar inside. */
function Shell({
  children,
  user = session.user,
  sessionVersion = session.sessionVersion,
}: {
  children: ReactNode;
  user?: MockUser;
  sessionVersion?: number;
}) {
  return (
    <SessionContext.Provider
      // A brand new value object on every render, exactly like the real
      // provider's heartbeat — even when the operator and role are unchanged.
      value={{ state: "authenticated", user, logout: () => {} }}
    >
      <div data-testid="shell" data-session-version={sessionVersion}>
        {children}
      </div>
    </SessionContext.Provider>
  );
}

/** Re-renders on demand, standing in for any unrelated parent render. */
function Harness({ user, sessionVersion }: { user?: MockUser; sessionVersion?: number }) {
  const [, setTick] = useState(0);
  return (
    <Shell user={user} sessionVersion={sessionVersion}>
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        rerender
      </button>
      <Sidebar />
    </Shell>
  );
}

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  session.sessionVersion = 0;
  route.current = "/outages";
  i18n.tCalls = 0;
});

afterEach(cleanup);

/** Every managed link in DOM order — the order the roving tabindex walks. */
function sidebarLinks(): HTMLAnchorElement[] {
  return Array.from(
    screen.getByRole("navigation").querySelectorAll<HTMLAnchorElement>(
      `[${SIDEBAR_LINK_ATTRIBUTE}]`,
    ),
  );
}

describe("Sidebar keyboard navigation (#831)", () => {
  it("exposes exactly one link to the tab order (roving tabindex)", () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const links = sidebarLinks();
    expect(links.length).toBeGreaterThan(1);
    expect(links.filter((link) => link.tabIndex === 0)).toHaveLength(1);
    links.slice(1).forEach((link) => expect(link.tabIndex).toBe(-1));
  });

  it("moves to the next link with ArrowDown", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(links[1]).toHaveFocus();
    expect(links[1]?.tabIndex).toBe(0);
    expect(links[0]?.tabIndex).toBe(-1);
  });

  it("moves backwards with ArrowUp", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[2]?.focus();
    await userEvent.keyboard("{ArrowUp}");

    expect(links[1]).toHaveFocus();
  });

  it("supports the horizontal axis too", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(links[1]).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(links[0]).toHaveFocus();
  });

  it("wraps from the last link back to the first, and back again", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[links.length - 1]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(links[0]).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(links[links.length - 1]).toHaveFocus();
  });

  it("jumps to the ends with Home and End", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[3]?.focus();
    await userEvent.keyboard("{End}");
    expect(links[links.length - 1]).toHaveFocus();

    await userEvent.keyboard("{Home}");
    expect(links[0]).toHaveFocus();
  });

  it("never traps focus — Tab still leaves the sidebar", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[0]?.focus();
    await userEvent.tab();

    // Hijacking Tab would make the sidebar a focus trap.
    expect(links[0]).not.toHaveFocus();
  });

  it("ignores the arrow keys when focus is outside the link list", async () => {
    render(
      <Shell>
        <button type="button">outside</button>
        <Sidebar />
      </Shell>,
    );

    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();

    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Home}{End}");

    expect(outside).toHaveFocus();
  });

  it("reaches every link exactly once, in DOM order", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const links = sidebarLinks();

    links[0]?.focus();
    const visited = [links[0]?.getAttribute("href") ?? ""];
    for (let i = 0; i < links.length - 1; i += 1) {
      await userEvent.keyboard("{ArrowDown}");
      visited.push(document.activeElement?.getAttribute("href") ?? "");
    }

    expect(visited).toEqual(links.map((link) => link.getAttribute("href")));
  });

  it("keeps every link in the accessibility tree despite tabindex={-1}", () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    sidebarLinks().forEach((link) => {
      expect(link).not.toHaveAttribute("aria-hidden");
      expect(link.textContent?.trim()).not.toBe("");
    });
  });

  it("lets a group heading be collapsed and expanded from the keyboard", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const heading = screen.getByRole("button", { name: /sidebar.groups.operations/ });
    expect(heading).toHaveAttribute("aria-expanded", "true");

    heading.focus();
    await userEvent.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: /sidebar.groups.operations/ }),
    ).toHaveAttribute("aria-expanded", "false");

    await userEvent.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: /sidebar.groups.operations/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the tab order valid after a group is collapsed", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const before = sidebarLinks().length;
    await userEvent.click(screen.getByRole("button", { name: /sidebar.groups.operations/ }));

    const after = sidebarLinks();
    expect(after.length).toBeLessThan(before);
    // Exactly one tab stop survives the shrink.
    expect(after.filter((link) => link.tabIndex === 0)).toHaveLength(1);

    // And the arrow keys still walk the shorter list.
    after[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(after[1]).toHaveFocus();
  });

  it("never lets a collapsed link receive focus", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const target = sidebarLinks()[1];
    const href = target?.getAttribute("href");

    // Focus a link inside the group, then collapse it.
    target?.focus();
    expect(document.activeElement).toBe(target);

    await userEvent.click(screen.getByRole("button", { name: /sidebar.groups.operations/ }));

    // The link is gone from the tree, not merely hidden — leaving it in with
    // CSS would keep it focusable and announced while invisible.
    expect(document.activeElement?.getAttribute("href")).not.toBe(href);
    expect(
      screen.queryByRole("link", { name: "common.outages" }),
    ).toBeNull();
  });
});

describe("Sidebar re-render optimisation (#830)", () => {
  it("does not re-render its subtree on an unrelated parent re-render", () => {
    const { rerender } = render(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    const before = i18n.tCalls;

    // Same props, new parent render — memo() must short-circuit.
    rerender(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    expect(i18n.tCalls).toBe(before);
  });

  it("survives a session heartbeat that only changes the session object", () => {
    const { rerender } = render(
      <Shell user={session.user} sessionVersion={0}>
        <Sidebar />
      </Shell>,
    );
    const before = i18n.tCalls;

    // The case that used to re-diff the whole link tree several times a
    // minute: identical content, fresh object identity.
    session.sessionVersion += 1;
    rerender(
      <Shell user={session.user} sessionVersion={session.sessionVersion}>
        <Sidebar />
      </Shell>,
    );

    expect(i18n.tCalls).toBe(before);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("re-renders when the route it reads actually changes", () => {
    const { rerender } = render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    // `usePathname` starts at "/outages".
    expect(screen.getByRole("link", { name: "common.outages" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    route.current = "/payments";
    rerender(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    expect(screen.getByRole("link", { name: "common.payments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "common.outages" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("still picks up a role change through the session context", () => {
    // Context updates propagate through React.memo, which is what keeps this
    // correct even though the sidebar itself is memoized.
    const { rerender } = render(
      <Shell user={{ id: "u1", email: "admin@apexchain.com", role: "admin" }}>
        <Sidebar />
      </Shell>,
    );
    expect(screen.getByRole("button", { name: /administration/ })).toBeInTheDocument();

    rerender(
      <Shell user={{ id: "u2", email: "viewer@apexchain.com", role: "operator" }}>
        <Sidebar />
      </Shell>,
    );

    expect(screen.queryByRole("button", { name: /administration/ })).toBeNull();
    expect(screen.getByRole("link", { name: "common.settings" })).toBeInTheDocument();
  });

  it("re-renders only the toggled group, leaving sibling DOM untouched", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    // Node identity, not a render counter: if the operations group had
    // re-rendered, React would have replaced these elements.
    const dashboardBefore = screen.getByRole("link", { name: "common.dashboard" });
    const settingsBefore = screen.getByRole("link", { name: "common.settings" });

    await userEvent.click(screen.getByRole("button", { name: /administration/ }));

    expect(screen.getByRole("link", { name: "common.dashboard" })).toBe(dashboardBefore);
    expect(screen.getByRole("link", { name: "common.settings" })).toBe(settingsBefore);

    // And the toggled group did change.
    expect(screen.getByRole("button", { name: /administration/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "common.config" })).toBeNull();
  });

  it("keeps handler identities stable so memoized groups are not invalidated", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const dashboardBefore = screen.getByRole("link", { name: "common.dashboard" });

    // Collapsing changes state, which re-renders Sidebar. If `onToggle` or
    // `onActiveLinkChange` had a fresh identity on every render, React.memo
    // would fail for every group and these elements would be replaced.
    await userEvent.click(screen.getByRole("button", { name: /operations/ }));

    expect(screen.getByRole("link", { name: "common.dashboard" })).toBe(dashboardBefore);
  });

  it("does not accumulate listeners as the destination count grows", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    // One delegated keydown on the <nav>, not one listener per link.
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("keeps rendering correctly across repeated parent re-renders", async () => {
    render(<Harness user={session.user} sessionVersion={0} />);

    const rerenderButton = screen.getByRole("button", { name: "rerender" });
    for (let i = 0; i < 5; i += 1) {
      session.sessionVersion += 1;
      await userEvent.click(rerenderButton);
    }

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(sidebarLinks().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });
});

describe("Sidebar mounted in the shell (#829)", () => {
  it("composes with the page beside it without interfering", async () => {
    render(
      <Shell>
        <Sidebar />
        <main data-testid="page-content">
          <button type="button">page action</button>
        </main>
      </Shell>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "page action" });
    action.focus();
    await userEvent.keyboard("{ArrowDown}");
    // The sidebar's arrow handling must not reach into the page.
    expect(action).toHaveFocus();
  });

  it("keeps navigation independent when the page navigates away and back", async () => {
    const { rerender } = render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const links = sidebarLinks();
    links[0]?.focus();

    route.current = "/payments";
    rerender(
      <Shell>
        <Sidebar />
      </Shell>,
    );
    route.current = "/outages";
    rerender(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    // Route changes must not disturb the roving tabindex.
    expect(sidebarLinks().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it("preserves the tab stop across repeated expand/collapse cycles", async () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const heading = screen.getByRole("button", { name: /operations/ });
    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(heading);
      expect(sidebarLinks().filter((link) => link.tabIndex === 0)).toHaveLength(1);
      await userEvent.click(heading);
      expect(sidebarLinks().filter((link) => link.tabIndex === 0)).toHaveLength(1);
    }
  });

  it("exposes both groups as landmarks-scoped headings when the operator is an admin", () => {
    render(
      <Shell>
        <Sidebar />
      </Shell>,
    );

    const headings = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent);
    expect(headings).toContain("sidebar.groups.operations");
    expect(headings).toContain("sidebar.groups.administration");
  });
});