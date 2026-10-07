import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLink } from "@/components/account/AdminLink";

const { account } = vi.hoisted(() => ({
  account: { user: null as { email?: string } | null, ready: false },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/account/AccountProvider", () => ({
  useAccount: () => account,
}));

describe("AdminLink", () => {
  beforeEach(() => {
    account.user = null;
    account.ready = false;
  });

  it("shows the dashboard link only for the configured admin email", () => {
    account.ready = true;
    account.user = { email: "  AHMED13REDMX@gmail.com " };

    render(<AdminLink />);

    expect(screen.getByRole("link", { name: "لوحة الإدارة" })).toHaveAttribute("href", "/admin");
  });

  it("keeps the dashboard link hidden from regular or not-yet-loaded accounts", () => {
    account.ready = true;
    account.user = { email: "student@example.com" };
    const { rerender } = render(<AdminLink />);

    expect(screen.queryByRole("link", { name: "لوحة الإدارة" })).not.toBeInTheDocument();

    account.ready = false;
    account.user = { email: "ahmed13redmx@gmail.com" };
    rerender(<AdminLink />);

    expect(screen.queryByRole("link", { name: "لوحة الإدارة" })).not.toBeInTheDocument();
  });
});
