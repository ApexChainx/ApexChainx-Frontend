/** ApexChain Frontend Test Suite — onboarding tour controller */
import { render, waitFor, act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted shared mocks (referenced inside vi.mock factories) ---
const h = vi.hoisted(() => {
  const driverInstance = {
    drive: vi.fn(),
    destroy: vi.fn(),
    getActiveIndex: vi.fn(() => 0),
    moveNext: vi.fn(),
    movePrevious: vi.fn(),
    isActive: vi.fn(() => false),
    highlight: vi.fn(),
  };
  const state: { config: any } = { config: null };
  const driver = vi.fn((config: any) => {
    state.config = config;
    return driverInstance;
  });
  return { driverInstance, driver, state };
});

const prefs = vi.hoisted(() => ({
  getPreferences: vi.fn(() => ({}) as Record<string, unknown>),
  hydratePreferences: vi.fn(async () => ({}) as Record<string, unknown>),
  subscribeToPreferences: vi.fn(() => () => {}),
  updatePreferences: vi.fn(async () => ({}) as Record<string, unknown>),
}));

const session = vi.hoisted(() => ({ state: "authenticated" as string }));

// driver.js + its stylesheet (jsdom can't parse the CSS import).
vi.mock("driver.js", () => ({ driver: h.driver }));
vi.mock("driver.js/dist/driver.css", () => ({}));

vi.mock("@/lib/preferences", () => prefs);
vi.mock("@/hooks/useSession", () => ({ useSession: () => ({ state: session.state }) }));
vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "en" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

// Import under test AFTER mocks are registered.
import OnboardingTour from "@/components/onboarding/OnboardingTour";

describe("OnboardingTour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.config = null;
    session.state = "authenticated";
    prefs.getPreferences.mockReturnValue({});
    prefs.hydratePreferences.mockResolvedValue({});
    prefs.updatePreferences.mockResolvedValue({});
  });

  afterEach(() => cleanup());

  it("renders nothing and never starts when the tour is already done", async () => {
    prefs.getPreferences.mockReturnValue({ onboardingTourDone: true });
    prefs.hydratePreferences.mockResolvedValue({ onboardingTourDone: true });

    const { container } = render(<OnboardingTour />);

    await waitFor(() => expect(prefs.hydratePreferences).toHaveBeenCalled());
    // Let any (unwanted) start effect flush.
    await act(async () => {});

    expect(container).toBeEmptyDOMElement();
    expect(h.driver).not.toHaveBeenCalled();
    expect(h.driverInstance.drive).not.toHaveBeenCalled();
  });

  it("auto-starts once authenticated with the flag unset", async () => {
    render(<OnboardingTour />);

    await waitFor(() => expect(h.driver).toHaveBeenCalledTimes(1));
    expect(h.driverInstance.drive).toHaveBeenCalledWith(0);
  });

  it("does not start when unauthenticated even if the flag is unset", async () => {
    session.state = "unauthenticated";

    render(<OnboardingTour />);

    await waitFor(() => expect(prefs.hydratePreferences).toHaveBeenCalled());
    await act(async () => {});

    expect(h.driver).not.toHaveBeenCalled();
  });

  it("persists the opt-out when the tour ends (Done / Skip / Esc / overlay)", async () => {
    render(<OnboardingTour />);

    await waitFor(() => expect(h.driver).toHaveBeenCalledTimes(1));

    // driver.js fires onDestroyed however the tour ends — simulate it.
    act(() => {
      h.state.config.onDestroyed();
    });

    expect(prefs.updatePreferences).toHaveBeenCalledWith({ onboardingTourDone: true });
  });
});
