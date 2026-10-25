import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearAuthReturn,
  getAuthReturn,
  rememberAuthReturn,
  safeAuthReturnPath,
} from "@/lib/auth-return";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";
import { Route } from "@/routes/auth.callback";

const mocks = vi.hoisted(() => ({ session: vi.fn(), navigate: vi.fn(), oauth: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mocks.session, signInWithOAuth: mocks.oauth } },
}));
vi.mock("@/components/site/PreferencesProvider", () => ({
  useSitePreferences: () => ({ language: "ar" }),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
const Callback = Route.options.component as React.ComponentType;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/fcds");
  mocks.navigate.mockResolvedValue(undefined);
  mocks.oauth.mockResolvedValue({ error: null });
  mocks.session.mockResolvedValue({
    data: { session: { user: { id: "student", is_anonymous: false } } },
    error: null,
  });
});
afterEach(cleanup);

it.each([
  "/fcds",
  "/fcds/course/linear-algebra?tab=videos#sources",
  "/fcds/calculator",
  "/fcds/messages",
  "/naqya",
  "/saved",
])("returns to %s after Google login, including strict-mode effect retries", async (path) => {
  window.history.replaceState({}, "", path);
  render(<GoogleSignIn />);
  fireEvent.click(screen.getByRole("button", { name: "المتابعة باستخدام Google" }));
  await waitFor(() => expect(mocks.oauth).toHaveBeenCalledOnce());
  expect(getAuthReturn()).toBe(path);
  cleanup();
  window.history.replaceState({}, "", "/auth/callback?code=test");
  render(
    <StrictMode>
      <Callback />
    </StrictMode>,
  );
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ href: path, replace: true }));
  expect(mocks.navigate).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem("naqya-auth-return")).toBeNull();
  expect(screen.queryByText("أهلاً بيك في نقيا")).not.toBeInTheDocument();
});

it("retains the destination on failed login and callback retry", async () => {
  rememberAuthReturn();
  window.history.replaceState({}, "", "/auth/callback?error=denied");
  mocks.session.mockResolvedValue({ data: { session: null }, error: new Error("denied") });
  render(<Callback />);
  await screen.findByText("تسجيل الدخول ما اكتمل");
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "المتابعة باستخدام Google" }));
  await waitFor(() => expect(mocks.oauth).toHaveBeenCalledOnce());
  expect(getAuthReturn()).toBe("/fcds");
});

it("supports chat intent and old pending chat logins", () => {
  rememberAuthReturn("support-chat");
  expect(getAuthReturn()).toBe("/fcds/messages");
  sessionStorage.removeItem("naqya-auth-return");
  expect(getAuthReturn()).toBe("/fcds/messages");
  clearAuthReturn();
  expect(getAuthReturn()).toBe("/naqya");
});

it.each([
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/auth/callback?code=old",
  "/x/../auth/callback",
  "/fcds\n",
  "javascript:alert(1)",
])("rejects unsafe or looping return path %s", (path) => {
  expect(safeAuthReturnPath(path)).toBeNull();
  sessionStorage.setItem("naqya-auth-return", path);
  expect(getAuthReturn()).toBe("/naqya");
});

it("does not treat an anonymous session as completed Google login", async () => {
  rememberAuthReturn();
  window.history.replaceState({}, "", "/auth/callback");
  mocks.session.mockResolvedValue({
    data: { session: { user: { is_anonymous: true } } },
    error: null,
  });
  render(<Callback />);
  await screen.findByText("تسجيل الدخول ما اكتمل");
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(getAuthReturn()).toBe("/fcds");
});
