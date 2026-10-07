import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceProgress } from "@/components/account/ResourceProgress";

const mocks = vi.hoisted(() => ({
  user: { id: "student-a" } as { id: string } | null,
  from: vi.fn(), upsert: vi.fn(), remove: vi.fn(), refreshSession: vi.fn(),
}));
vi.mock("@/components/account/AccountProvider", () => ({
  useAccount: () => ({ user: mocks.user, ready: true, refreshSession: mocks.refreshSession }),
}));
vi.mock("@/components/site/PreferencesProvider", () => ({ useSitePreferences: () => ({ language: "en" }) }));
vi.mock("@/components/account/GoogleSignIn", () => ({ GoogleSignIn: () => <button>Google sign in</button> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
let rows: { fcds_playlist_id: string; status: string }[];
let readOwner: unknown[];
let deleted: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "student-a" };
  rows = []; readOwner = []; deleted = {};
  mocks.refreshSession.mockResolvedValue({ user: null, error: null });
  mocks.upsert.mockImplementation(async (row) => {
    rows = [{ fcds_playlist_id: row.fcds_playlist_id, status: row.status }];
    return { error: null };
  });
  mocks.remove.mockImplementation(() => ({ eq: (column: string, value: unknown) => {
    deleted[column] = value;
    return { eq: async (second: string, other: unknown) => { deleted[second] = other; rows = []; return { error: null }; } };
  } }));
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: (...owner: unknown[]) => {
      readOwner = owner;
      return { abortSignal: async () => ({ data: [...rows], error: null }) };
    } }),
    upsert: mocks.upsert, delete: mocks.remove,
  }));
});
afterEach(cleanup);
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ResourceProgress id="resource-1" /></QueryClientProvider>);
}

describe("private resource progress", () => {
  it("saves started/completed states for the current student and can clear them", async () => {
    mount();
    const started = screen.getByRole("button", { name: "In progress" });
    const completed = screen.getByRole("button", { name: "Completed" });
    await waitFor(() => expect(started).not.toBeDisabled());
    expect(readOwner).toEqual(["user_id", "student-a"]);
    fireEvent.click(started);
    await waitFor(() => expect(started).toHaveAttribute("aria-pressed", "true"));
    expect(mocks.upsert).toHaveBeenCalledWith({ user_id: "student-a", fcds_playlist_id: "resource-1", status: "in_progress" }, { onConflict: "user_id,fcds_playlist_id" });
    fireEvent.click(completed);
    await waitFor(() => expect(completed).toHaveAttribute("aria-pressed", "true"));
    expect(started).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(completed);
    await waitFor(() => expect(completed).toHaveAttribute("aria-pressed", "false"));
    expect(deleted).toEqual({ user_id: "student-a", fcds_playlist_id: "resource-1" });
  });
  it("asks a guest to sign in without writing progress", async () => {
    mocks.user = null;
    mount();
    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not mark progress as saved when the database rejects the write", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "Access denied" } });
    mount();
    const started = screen.getByRole("button", { name: "In progress" });
    await waitFor(() => expect(started).not.toBeDisabled());
    fireEvent.click(started);
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalled());
    await waitFor(() => expect(started).not.toBeDisabled());
    expect(started).toHaveAttribute("aria-pressed", "false");
  });
});
