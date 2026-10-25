import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarbStats } from "@/components/fcds/DarbStats";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mock.rpc } }));
vi.mock("@/components/site/PreferencesProvider", () => ({
  useSitePreferences: () => ({ language: "en" }),
}));
beforeEach(() => {
  mock.rpc.mockReset();
});
afterEach(cleanup);
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DarbStats />
    </QueryClientProvider>,
  );
}
it("shows the actual distinct-source and historical daily-visit aggregate", async () => {
  mock.rpc.mockResolvedValue({
    data: { playlists: 30, videos: 21, visits: 500, tracked_since: "2026-10-07T18:46:29Z" },
    error: null,
  });
  mount();
  expect(await screen.findByText("500")).toBeVisible();
  expect(screen.getByText("30")).toBeVisible();
  expect(screen.getByText("21")).toBeVisible();
  expect(screen.getByText(/once per browser per day/)).toBeVisible();
  expect(mock.rpc).toHaveBeenCalledWith("get_darb_public_stats");
});
it("never invents zero counts while loading", () => {
  mock.rpc.mockReturnValue(new Promise(() => {}));
  mount();
  expect(screen.getAllByText("—")).toHaveLength(3);
  expect(screen.queryByText("0")).not.toBeInTheDocument();
});
it("shows an unavailable state and retries a failed aggregate", async () => {
  mock.rpc
    .mockResolvedValueOnce({ data: null, error: new Error("Unavailable") })
    .mockResolvedValueOnce({
      data: { playlists: 1, videos: 2, visits: 3, tracked_since: null },
      error: null,
    });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Statistics unavailable/ }));
  expect(await screen.findByText("3")).toBeVisible();
});
