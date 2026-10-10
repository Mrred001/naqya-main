import { describe, expect, it, vi, beforeEach } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { parseYouTube } from "@/lib/content";
import { checkSuggestionLink } from "@/lib/suggestion-links";
import { recordFcdsOpen } from "@/lib/fcds-discovery";

describe("YouTube identity and duplicate suggestions", () => {
  it("matches watch, short, embed, live and shortened URLs despite tracking or timestamps", () => {
    for (const url of [
      "https://youtube.com/watch?v=AbC_123-xYz&t=30&list=PL123",
      "https://youtu.be/AbC_123-xYz?si=tracking",
      "https://www.youtube.com/shorts/AbC_123-xYz",
      "https://m.youtube.com/live/AbC_123-xYz",
      "https://www.youtube-nocookie.com/embed/AbC_123-xYz",
    ]) expect(parseYouTube(url)).toEqual({ id: "AbC_123-xYz", kind: "video" });
    expect(parseYouTube("https://youtube.com/playlist?list=PL123&si=x")).toEqual({ id: "PL123", kind: "playlist" });
  });
  it("rejects lookalike domains and non-web protocols", () => {
    for (const url of ["https://evil.test/watch?v=123", "https://youtu.be.evil.test/123", "ftp://youtube.com/watch?v=123"])
      expect(parseYouTube(url)).toBeNull();
  });
  it("checks both existing and pending duplicates and fails closed on a lookup error", async () => {
    rpc.mockResolvedValueOnce({ data: "existing", error: null });
    expect(await checkSuggestionLink(" https://youtu.be/abc ")).toBe("existing");
    expect(rpc).toHaveBeenLastCalledWith("suggestion_link_status", { resource_url: "https://youtu.be/abc" });
    rpc.mockResolvedValueOnce({ data: "pending", error: null });
    expect(await checkSuggestionLink("https://youtu.be/abc")).toBe("pending");
    rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    await expect(checkSuggestionLink("https://youtu.be/abc")).rejects.toThrow("offline");
  });
});

describe("resource open tracking", () => {
  beforeEach(() => { rpc.mockReset(); localStorage.clear(); });
  it("reuses one anonymous browser key so repeated clicks can be deduplicated on the server", async () => {
    rpc.mockResolvedValue({ error: null });
    await recordFcdsOpen("resource-1");
    await recordFcdsOpen("resource-1");
    const first = rpc.mock.calls[0][1];
    expect(first.visitor_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rpc.mock.calls[1]).toEqual(["record_fcds_open", first]);
  });
  it("does not reject or block navigation when telemetry fails", async () => {
    rpc.mockRejectedValueOnce(new Error("offline"));
    await expect(recordFcdsOpen("resource-1")).resolves.toBeUndefined();
  });
});
