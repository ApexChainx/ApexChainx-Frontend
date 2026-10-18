/**
 * ApexChain Frontend Test Suite — Footer integration tests (Issue #813),
 * re-render optimisation (#814) and keyboard navigation (#815).
 *
 * These exercise the footer as a whole and drive it the way an operator does:
 * by tabbing, arrow-keying and re-rendering under session churn.
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked — `t` echoes the key.
 *
 * The session mock is backed by a real React context rather than a plain
 * function. That matters: `React.memo` skips prop-equal re-renders, but a
 * *context* update still propagates through it. Modelling the session as a
 * context is therefore what makes these tests exercise the real behaviour —
 * a plain function mock would let `memo` swallow a session change entirely.
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
  /** Bumped to emulate a heartbeat: a new session object, identical content. */
  sessionVersion: 0,
}));

const i18n = vi.hoisted(() => ({ tCalls: 0 }));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      i18n.tCalls += 1;
      if (key === "footer.copyright") return `footer.copyright:${params?.year}`;
      return key;
    },
    locale: "en",
  }),
}));

vi.mock("@/hooks/useSession", async () => {
  const { createContext, useContext } = await import("react");
  interface MockUser {
    id: string;
    email: string;
    role: string;
  }
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

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "testnet" }));

import Footer from "@/components/layout/Footer";
import { SessionContext } from "@/hooks/useSession";

/** The provider stack the root layout mounts the footer inside. */
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
      <Footer year={2026} />
    </Shell>
  );
}

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  session.sessionVersion = 0;
  i18n.tCalls = 0;
});

afterEach(cleanup);

/** All footer links in DOM order — the order the roving tabindex walks. */
function footerLinks(): HTMLAnchorElement[] {
  return Array.from(
    screen.getByTestId("footer-links").querySelectorAll<HTMLAnchorElement>(
      "[data-footer-link]",
    ),
  );
}

describe("Footer keyboard navigation (#815)", () => {
  it("exposes exactly one link to the tab order (roving tabindex)", () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    const links = footerLinks();
    expect(links.length).toBeGreaterThan(1);

    const tabbable = links.filter((link) => link.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(links[0]);
    // Everything else is reachable only via the arrow keys.
    links.slice(1).forEach((link) => expect(link.tabIndex).toBe(-1));
  });

  it("moves to the next link with ArrowRight", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(links[1]).toHaveFocus();
    // The tab stop moves with focus rather than staying on the first link.
    expect(links[1]?.tabIndex).toBe(0);
    expect(links[0]?.tabIndex).toBe(-1);
  });

  it("moves backwards with ArrowLeft", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[1]?.focus();
    await userEvent.keyboard("{ArrowLeft}");

    expect(links[0]).toHaveFocus();
  });

  it("supports the vertical axis so the columns feel like a grid", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(links[1]).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(links[0]).toHaveFocus();
  });

  it("wraps from the last link back to the first", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[links.length - 1]?.focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(links[0]).toHaveFocus();
  });

  it("wraps backwards from the first link to the last", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[0]?.focus();
    await userEvent.keyboard("{ArrowLeft}");

    expect(links[links.length - 1]).toHaveFocus();
  });

  it("jumps to the ends with Home and End", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[2]?.focus();
    await userEvent.keyboard("{End}");
    expect(links[links.length - 1]).toHaveFocus();

    await userEvent.keyboard("{Home}");
    expect(links[0]).toHaveFocus();
  });

  it("never traps focus — Tab still leaves the footer", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[0]?.focus();
    await userEvent.tab();

    // The arrow handler must not have consumed the Tab, so focus left the
    // single tab stop instead of walking every remaining link.
    expect(links[0]).not.toHaveFocus();
  });

  it("ignores the arrow keys when focus is outside the link region", async () => {
    render(
      <Shell>
        <button type="button">outside</button>
        <Footer year={2026} />
      </Shell>,
    );

    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();

    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Home}{End}");

    // Focus stays where the operator left it.
    expect(outside).toHaveFocus();
  });

  it("keeps every link in the accessibility tree despite tabindex={-1}", () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    // `tabIndex={-1}` removes a link from sequential focus only; it must stay
    // exposed and reachable via the arrow keys.
    footerLinks().forEach((link) => {
      expect(link).toBeInTheDocument();
      expect(link).not.toHaveAttribute("aria-hidden");
      expect(link.textContent?.trim()).not.toBe("");
    });
  });

  it("hands focus to every link in turn, so none is unreachable", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const links = footerLinks();

    links[0]?.focus();
    const visited: string[] = [links[0]?.getAttribute("href") ?? ""];
    for (let i = 0; i < links.length - 1; i += 1) {
      await userEvent.keyboard("{ArrowRight}");
      visited.push(document.activeElement?.getAttribute("href") ?? "");
    }

    // Every link was reachable exactly once, in DOM order.
    expect(visited).toEqual(links.map((link) => link.getAttribute("href")));
  });
});

describe("Footer re-render optimisation (#814)", () => {
  it("does not re-render its subtree on an unrelated parent re-render", () => {
    const { rerender } = render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    const before = i18n.tCalls;

    // Same props, new parent render — memo() must short-circuit the subtree.
    rerender(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    // No translation lookup means nothing inside the memoized tree re-ran.
    expect(i18n.tCalls).toBe(before);
  });

  it("survives a session heartbeat that only changes the session object", () => {
    const { rerender } = render(
      <Shell user={session.user} sessionVersion={0}>
        <Footer year={2026} />
      </Shell>,
    );
    const before = i18n.tCalls;

    // A heartbeat delivers a fresh session object every tick even though the
    // operator and role are unchanged — the case that used to re-diff ~40
    // footer elements several times a minute.
    session.sessionVersion += 1;
    rerender(
      <Shell user={session.user} sessionVersion={session.sessionVersion}>
        <Footer year={2026} />
      </Shell>,
    );

    expect(i18n.tCalls).toBe(before);
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("re-renders when a prop it actually reads changes", () => {
    const { rerender } = render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );
    expect(screen.getByText("footer.copyright:2026")).toBeInTheDocument();

    rerender(
      <Shell>
        <Footer year={2030} />
      </Shell>,
    );
    expect(screen.getByText("footer.copyright:2030")).toBeInTheDocument();
  });

  it("still picks up a role change through the session context", () => {
    // Context updates propagate through React.memo, which is what keeps this
    // correct even though the footer itself is memoized.
    const { rerender } = render(
      <Shell user={{ id: "u1", email: "admin@apexchain.com", role: "admin" }}>
        <Footer year={2026} />
      </Shell>,
    );
    expect(screen.getByText("common.config")).toBeInTheDocument();

    rerender(
      <Shell user={{ id: "u2", email: "viewer@apexchain.com", role: "operator" }}>
        <Footer year={2026} />
      </Shell>,
    );

    expect(screen.queryByText("common.config")).toBeNull();
    expect(screen.getByText("common.settings")).toBeInTheDocument();
  });

  it("keeps rendering correctly across repeated parent re-renders", async () => {
    render(<Harness user={session.user} sessionVersion={0} />);

    const rerenderButton = screen.getByRole("button", { name: "rerender" });
    for (let i = 0; i < 5; i += 1) {
      session.sessionVersion += 1;
      await userEvent.click(rerenderButton);
    }

    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    // Exactly one tab stop is maintained across all those renders.
    expect(footerLinks().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it("re-renders only the two links involved when focus moves", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    const links = footerLinks();
    links[0]?.focus();
    const callsBefore = i18n.tCalls;

    await userEvent.keyboard("{ArrowRight}");

    // Moving the roving tab stop re-runs only the link labels themselves — a
    // handful of lookups — not the whole footer subtree.
    expect(i18n.tCalls - callsBefore).toBeLessThanOrEqual(4);
  });
});

describe("Footer mounted in the shell (#813)", () => {
  it("composes with surrounding page content without interfering with it", async () => {
    render(
      <Shell>
        <main data-testid="page-content">
          <button type="button">page action</button>
        </main>
        <Footer year={2026} />
      </Shell>,
    );

    // The footer is present and the page it shares the shell with still works.
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "page action" });
    action.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(action).toHaveFocus();
  });

  it("keeps the roving tab stop valid after the visible link set shrinks", async () => {
    const { rerender } = render(
      <Shell user={{ id: "u1", email: "admin@apexchain.com", role: "admin" }}>
        <Footer year={2026} />
      </Shell>,
    );
    const adminLinks = footerLinks();

    // Walk to the very end while the admin-only column is still present.
    adminLinks[adminLinks.length - 1]?.focus();
    await userEvent.keyboard("{End}");
    expect(adminLinks[adminLinks.length - 1]).toHaveFocus();

    // Losing admin removes links; the stale index must be clamped so the
    // region still has exactly one valid tab stop.
    rerender(
      <Shell user={{ id: "u2", email: "viewer@apexchain.com", role: "operator" }}>
        <Footer year={2026} />
      </Shell>,
    );

    const operatorLinks = footerLinks();
    expect(operatorLinks.length).toBeLessThan(adminLinks.length);
    expect(operatorLinks.filter((link) => link.tabIndex === 0)).toHaveLength(1);

    // And the arrow keys still work from the clamped position.
    operatorLinks[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(operatorLinks[1]).toHaveFocus();
  });

  it("exposes a stable landmark name across re-renders", () => {
    const { rerender } = render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    const before = screen.getByRole("contentinfo").getAttribute("aria-label");
    for (let i = 0; i < 3; i += 1) {
      session.sessionVersion += 1;
      rerender(
        <Shell user={session.user} sessionVersion={session.sessionVersion}>
          <Footer year={2026} />
        </Shell>,
      );
    }

    expect(screen.getByRole("contentinfo").getAttribute("aria-label")).toBe(before);
  });

  it("keeps every column navigable in one unbroken sequence", async () => {
    render(
      <Shell>
        <Footer year={2026} />
      </Shell>,
    );

    const headings = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent)
      .filter(Boolean);

    // Walking the links with the arrow keys crosses every column, so the
    // columns are one continuous navigation region rather than three islands.
    const links = footerLinks();
    const lastColumnHrefs = links.slice(-2).map((link) => link.getAttribute("href"));
    expect(lastColumnHrefs.every(Boolean)).toBe(true);
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });
});