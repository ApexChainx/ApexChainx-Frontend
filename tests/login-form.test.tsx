/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import LoginForm from "@/components/auth/LoginForm";

const mockPost = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockStoreSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ storeSession: mockStoreSession }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockStoreSession.mockReset();
  });

  it("renders the password field hidden by default", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
  });

  it("toggles the password field to visible and back", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });

    fireEvent.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("keeps autocomplete attrs intact on the password field", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("autoComplete", "current-password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("autoComplete", "current-password");
  });

  it("renders a recovery link for forgot-password flows", () => {
    render(<LoginForm />);
    const recovery = screen.getByRole("link", { name: "Forgot password?" });
    expect(recovery).toHaveAttribute("href", expect.stringContaining("mailto:admin@apexchain.com"));
    expect(recovery).toHaveAttribute("href", expect.stringContaining("Password%20reset"));
  });
});