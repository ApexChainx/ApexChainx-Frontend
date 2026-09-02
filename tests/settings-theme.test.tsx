/** ApexChain Frontend Test Suite */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n/i18n";
import SettingsPage from "@/app/setting/page";

function renderSettingsPage() {
  return render(
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>
  );
}

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockToast = vi.fn();

// SettingsPage calls useRouter(); outside a real Next.js App Router tree
// this throws unless it's mocked, same as the other test files in this repo.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
  getAccessToken: () => null,
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}));
vi.mock("@/lib/explorer", () => ({ explorerLink: () => null, STELLAR_NETWORK: "testnet" }));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "unauthenticated", user: null }),
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

describe("SettingsPage theme effect", () => {
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();

    addEventListener = vi.fn();
    removeEventListener = vi.fn();

    // jsdom does not implement matchMedia, so every test file that touches
    // theme logic needs to stub it. We use a single shared object per test
    // so we can assert add/remove were called with the exact same handler.
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: vi.fn(), // deprecated, some libs still call it
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers exactly one 'change' listener on mount", () => {
    renderSettingsPage();

    const changeCalls = addEventListener.mock.calls.filter(([type]) => type === "change");
    expect(changeCalls).toHaveLength(1);
  });

  it("removes the same listener reference it added, on unmount", () => {
    const { unmount } = renderSettingsPage();

    const [, addedHandler] = addEventListener.mock.calls.find(([type]) => type === "change")!;

    unmount();

    const changeRemovals = removeEventListener.mock.calls.filter(([type]) => type === "change");
    expect(changeRemovals).toHaveLength(1);
    expect(changeRemovals[0]![1]).toBe(addedHandler);
  });

  it("keeps add/remove balanced across re-renders (no growing leak)", () => {
    const { unmount } = renderSettingsPage();

    unmount();

    const adds = addEventListener.mock.calls.filter(([type]) => type === "change");
    const removes = removeEventListener.mock.calls.filter(([type]) => type === "change");
    expect(removes).toHaveLength(adds.length);

    const addedHandlers = adds.map(([, handler]) => handler);
    const removedHandlers = removes.map(([, handler]) => handler);
    expect(removedHandlers).toEqual(addedHandlers);
  });
});