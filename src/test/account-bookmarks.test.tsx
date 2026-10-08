import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProvider, useAccount } from "@/components/account/AccountProvider";
import { SaveButton } from "@/components/account/SaveButton";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";
import { SiteHeader } from "@/components/site/SiteHeader";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  oauth: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithOAuth: mocks.oauth,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: () => false,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
let authEvent: (_event: string, session: { user: { id: string } } | null) => void;
let rows: Array<{
  id: string;
  content_id: string | null;
  fcds_playlist_id: string | null;
  created_at: string;
}>;
let ownerFilters: unknown[][];
function wrap(
  child: React.ReactNode,
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AccountProvider>{child}</AccountProvider>
      </QueryClientProvider>,
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  ownerFilters = [];
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
  mocks.onAuthStateChange.mockImplementation((callback) => {
    authEvent = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.from.mockImplementation(() => ({
    select: () => ({
      eq: (...args: unknown[]) => {
        ownerFilters.push(args);
        return { order: () => ({ abortSignal: async () => ({ data: rows, error: null }) }) };
      },
    }),
    insert: mocks.insert,
    delete: () => ({ eq: () => ({ eq: mocks.remove }) }),
  }));
  mocks.insert.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
afterEach(cleanup);
describe("Account privacy and saved sources", () => {
  it("shows optional Google sign-in instead of writing when signed out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    wrap(<SaveButton kind="general" id="video-1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "احفظ لوقت لاحق" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "احفظ لوقت لاحق" }));
    expect(await screen.findByRole("button", { name: "المتابعة باستخدام Google" })).toBeVisible();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("uses a persisted Supabase session when the account state is temporarily stale", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null } });
    wrap(<SaveButton kind="general" id="video-1" />);
    const button = await screen.findByRole("button", { name: "احفظ لوقت لاحق" });
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() =>
      expect(mocks.insert).toHaveBeenCalledWith({ user_id: "user-a", content_id: "video-1" }),
    );
    expect(
      screen.queryByRole("button", { name: "المتابعة باستخدام Google" }),
    ).not.toBeInTheDocument();
  });
  it("saves the current user's general source and filters private reads by owner", async () => {
    wrap(<SaveButton kind="general" id="video-1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "احفظ لوقت لاحق" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "احفظ لوقت لاحق" }));
    await waitFor(() =>
      expect(mocks.insert).toHaveBeenCalledWith({ user_id: "user-a", content_id: "video-1" }),
    );
    expect(ownerFilters).toContainEqual(["user_id", "user-a"]);
  });
  it("does not claim a successful save after a database failure", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "42501" } });
    wrap(<SaveButton kind="fcds" id="playlist-1" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "احفظ لوقت لاحق" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "احفظ لوقت لاحق" }));
    await waitFor(() =>
      expect(mocks.insert).toHaveBeenCalledWith({
        user_id: "user-a",
        fcds_playlist_id: "playlist-1",
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "احفظ لوقت لاحق" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "احفظ لوقت لاحق" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
  it("removes saved items only for the current user", async () => {
    rows = [
      { id: "bookmark-1", content_id: "video-1", fcds_playlist_id: null, created_at: "today" },
    ];
    wrap(<SaveButton kind="general" id="video-1" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "محفوظ" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "محفوظ" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("user_id", "user-a"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("discards private cached data on logout and unsubscribes on unmount", async () => {
    function Identity() {
      const { user, ready } = useAccount();
      return <p>{ready ? (user?.id ?? "guest") : "loading"}</p>;
    }
    const view = wrap(<Identity />);
    await screen.findByText("user-a");
    view.client.setQueryData(["bookmarks", "user-a"], [{ id: "private" }]);
    await act(async () => authEvent("SIGNED_OUT", null));
    expect(screen.getByText("guest")).toBeVisible();
    expect(view.client.getQueryData(["bookmarks", "user-a"])).toBeUndefined();
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it("does not let an older session lookup overwrite a newer account event", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    function Identity() {
      return <p>{useAccount().user?.id ?? "guest"}</p>;
    }
    wrap(<Identity />);
    await act(async () => authEvent("SIGNED_IN", { user: { id: "user-b" } }));
    await act(async () => finish({ data: { session: { user: { id: "user-a" } } } }));
    expect(screen.getByText("user-b")).toBeVisible();
  });
  it("shows saved items as a header icon and keeps sign-out in the account menu", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-a",
            email: "ahmed@example.com",
            user_metadata: { avatar_url: "https://google.test/avatar.png" },
          },
        },
      },
    });
    mocks.signOut.mockResolvedValue({ error: null });
    wrap(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "المحفوظات" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("button", { name: "تفعيل الوضع الفاتح" })).toBeVisible();

    const avatar = await screen.findByRole("button", { name: "حسابي" });

    fireEvent.keyDown(avatar, { key: "Enter" });
    expect(screen.queryByRole("menuitem", { name: "المحفوظات" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "تسجيل خروج من الجهاز ده" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
it("uses only profile scopes, same-origin callback and allows retry on OAuth error", async () => {
  mocks.oauth.mockResolvedValue({ error: { message: "Provider disabled" } });
  render(<GoogleSignIn />);
  fireEvent.click(screen.getByRole("button", { name: "المتابعة باستخدام Google" }));
  await screen.findByRole("alert");
  expect(mocks.oauth).toHaveBeenCalledWith({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: "openid email profile",
    },
  });
  expect(screen.getByRole("button", { name: "المتابعة باستخدام Google" })).toBeEnabled();
});
