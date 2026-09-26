/** ApexChain Frontend Test Suite */
/**
 * Issue #621 — replay-event guards for the onboarding tour.
 *
 * The START_TOUR_EVENT handler must be idempotent: rapid repeats collapse
 * into a single driver lifecycle, a replay while a tour is live tears down
 * and restarts atomically (no double-mount), and step selectors that no
 * longer resolve in the DOM are skipped gracefully instead of highlighting
 * a missing node.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { driver } from "driver.js";
import OnboardingTour, {
  START_TOUR_EVENT,
} from "@/components/onboarding/OnboardingTour";

// driver.js is mocked; the fake records drive/destroy calls so a test can
// assert a single driver lifecycle across rapid event dispatches.
const mockDrive = vi.fn();
const mockDestroy = vi.fn();
const mockMoveNext = vi.fn();
const mockMovePrevious = vi.fn();
const mockGetActiveIndex = vi.fn(() => 0);
const mockIsActive = vi.fn(() => false);

vi.mock("driver.js", () => ({
  driver: vi.fn(() => ({
    drive: mockDrive,
    destroy: mockDestroy,
    moveNext: mockMoveNext,
    movePrevious: mockMovePrevious,
    getActiveIndex: mockGetActiveIndex,
    isActive: mockIsActive,
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "unauthenticated", user: null }),
}));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    // Return the key so resolveCopy falls back to the inline English copy.
    t: (key: string) => key,
    locale: "en",
  }),
}));

vi.mock("@/lib/preferences", () => ({
  getPreferences: () => ({ onboardingTourDone: true }),
  hydratePreferences: vi.fn(() => Promise.resolve({ onboardingTourDone: true })),
  subscribeToPreferences: vi.fn(() => () => {}),
  updatePreferences: vi.fn(),
}));

const driverMock = driver as unknown as ReturnType<typeof vi.fn>;

function startTour() {
  window.dispatchEvent(new CustomEvent(START_TOUR_EVENT));
}

describe("OnboardingTour replay guards (Issue #621)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    driverMock.mockReset();
    mockDrive.mockReset();
    mockDestroy.mockReset();
    mockIsActive.mockReset();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses rapid START_TOUR_EVENT dispatches into a single driver lifecycle", async () => {
    const { unmount } = render(<OnboardingTour />);

    // Fire the event twice rapidly (synchronously) — the debounce must
    // collapse them into one start, so only one driver is ever mounted.
    act(() => {
      startTour();
      startTour();
    });

    expect(mockDrive).not.toHaveBeenCalled();

    // Let the debounce window elapse.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(driverMock).toHaveBeenCalledTimes(1);
    expect(mockDrive).toHaveBeenCalledTimes(1);

    // Unmounting tears the live driver down exactly once — one full
    // lifecycle (one drive, one destroy) for the two rapid events.
    act(() => {
      unmount();
    });
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it("tears down and restarts atomically when replayed mid-tour", async () => {
    document.body.innerHTML = '<div data-tour="dashboard-kpis"></div>';
    render(<OnboardingTour />);

    // Start the tour.
    act(() => {
      startTour();
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(mockDrive).toHaveBeenCalledTimes(1);

    // Replay while the first tour is live → destroy + restart, no double-mount.
    act(() => {
      startTour();
    });
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDrive).toHaveBeenCalledTimes(2);
  });

  it("skips steps whose selectors no longer resolve in the DOM", async () => {
    // dashboard-kpis is present; dashboard-filters (same route) is missing.
    document.body.innerHTML = '<div data-tour="dashboard-kpis"></div>';

    render(<OnboardingTour />);

    act(() => {
      startTour();
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(driverMock).toHaveBeenCalledTimes(1);
    const config = driverMock.mock.calls[0]?.[0] as {
      steps: Array<{ element: string }>;
    };
    const elements = config.steps.map((step) => step.element);

    // The present same-route step is kept…
    expect(elements).toContain('[data-tour="dashboard-kpis"]');
    // …the missing same-route step is skipped gracefully…
    expect(elements).not.toContain('[data-tour="dashboard-filters"]');
    // …and steps on other routes are still queued for later navigation.
    expect(elements).toContain('[data-tour="outages-search"]');
  });
});
