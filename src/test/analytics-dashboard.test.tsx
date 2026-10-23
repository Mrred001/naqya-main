import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const summary = {
  tracked_since: "2026-10-23T13:06:14Z",
  current: {
    visitors: 4,
    sessions: 5,
    opens: 3,
    open_visitors: 2,
    returning: 1,
    saves: 1,
    shares: 2,
    searches: 2,
    no_results: 1,
  },
  previous: { visitors: 2, opens: 1 },
  daily: [{ day: "2026-10-23", visitors: 4, opens: 3 }],
  resources: [],
  courses: [],
  searches: [],
  missed_searches: [],
  sources: [],
  campaigns: [],
  retention: { eligible: 0, returned: 0 },
  coverage: { covered: 12, total: 34, missing: [] },
  pending: 2,
  reports: 0,
};
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "get_daily_site_visits"
      ? { data: [{ visit_date: "2026-10-23", total: 56 }], error: null }
      : { data: summary, error: null },
  );
});
function open() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AnalyticsDashboard />
    </QueryClientProvider>,
  );
}
it("shows real engagement, historical traffic, and an honest retention baseline", async () => {
  open();
  expect(await screen.findByText("50%")).toBeInTheDocument();
  expect(screen.getByText(/Legacy daily traffic · today 56/)).toBeInTheDocument();
  expect(screen.getByText("Collecting data")).toBeInTheDocument();
  expect(screen.getByText(/Earlier traffic remains/)).toBeInTheDocument();
  expect(screen.getByText("12 / 34")).toBeInTheDocument();
});
it("requests the selected library and period independently", async () => {
  open();
  await screen.findByText("50%");
  fireEvent.change(screen.getByLabelText("Analytics library"), { target: { value: "fcds" } });
  fireEvent.change(screen.getByLabelText("Analytics period"), { target: { value: "30" } });
  await waitFor(() =>
    expect(mocks.rpc).toHaveBeenCalledWith("get_site_analytics", { p_days: 30, p_library: "fcds" }),
  );
});
it("reports a loading failure instead of presenting fabricated zero statistics", async () => {
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "get_site_analytics"
      ? { data: null, error: new Error("offline") }
      : { data: [], error: null },
  );
  open();
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load analytics");
  expect(screen.queryByText("Source opens")).not.toBeInTheDocument();
});
