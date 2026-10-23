import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanSearchTerm,
  libraryForPath,
  recordPageAnalytics,
  trackAnalytics,
  trafficSource,
} from "@/lib/analytics";
import { percent, periodChange } from "@/lib/analytics-dashboard";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
let nextId = 0;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({ error: null });
  nextId = 0;
  Object.defineProperty(window.crypto, "randomUUID", {
    configurable: true,
    value: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
  });
});
describe("private-by-default usage analytics", () => {
  it("keeps a browser identity across sessions while replacing an idle session", async () => {
    await trackAnalytics("page_view", "fcds", { path: "/fcds" });
    const first = mocks.rpc.mock.calls[0]![1];
    const stored = JSON.parse(sessionStorage.getItem("naqya-analytics-session-v1")!);
    stored.lastAt = Date.now() - 31 * 60_000;
    sessionStorage.setItem("naqya-analytics-session-v1", JSON.stringify(stored));
    await trackAnalytics("page_view", "general", { path: "/naqya" });
    const second = mocks.rpc.mock.calls[1]![1];
    expect(second.p_visitor).toBe(first.p_visitor);
    expect(second.p_session).not.toBe(first.p_session);
  });
  it("does not collect admin routes or sensitive search strings", async () => {
    recordPageAnalytics("/admin");
    await trackAnalytics("search", "fcds", { term: "student@example.com", results: 0 });
    await trackAnalytics("search", "general", { term: "https://example.com/private", results: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(cleanSearchTerm("  Linear   Algebra ")).toBe("linear algebra");
    expect(cleanSearchTerm("01234567890")).toBeNull();
  });
  it("counts a NAQYA watch-page open without claiming video playback", async () => {
    recordPageAnalytics("/watch/00000000-0000-4000-8000-000000000001");
    expect(mocks.rpc.mock.calls.map((c) => c[1].p_event)).toEqual(["page_view", "resource_open"]);
    expect(mocks.rpc.mock.calls[1]![1].p_library).toBe("general");
  });
  it("sanitizes campaign attribution without retaining a referrer path", () => {
    expect(
      trafficSource("https://naqya.test/fcds?utm_source=whatsapp&utm_campaign=exam", ""),
    ).toEqual({ source: "whatsapp", campaign: "exam" });
    expect(
      trafficSource("https://naqya.test/naqya", "https://www.google.com/search?q=private"),
    ).toEqual({ source: "google", campaign: null });
    expect(trafficSource("https://naqya.test/fcds", "").source).toBe("direct");
    expect(libraryForPath("/fcds/course/linear-algebra")).toBe("fcds");
  });
  it("does not block content when telemetry fails", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("offline"));
    await expect(
      trackAnalytics("save", "general", { resourceId: "test" }),
    ).resolves.toBeUndefined();
  });
  it("reports empty denominators and new baselines honestly", () => {
    expect(percent(0, 0)).toBeNull();
    expect(percent(3, 4)).toBe(75);
    expect(periodChange(10, 5)).toBe("+100% vs previous period");
    expect(periodChange(10, 0)).toContain("no baseline");
  });
});
