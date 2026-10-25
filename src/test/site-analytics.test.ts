import { describe, expect, it } from "vitest";
import { egyptDateKey } from "@/lib/site-analytics";
describe("Egypt analytics day boundaries", () => {
  it("uses summer time at the Cairo midnight boundary", () => {
    expect(egyptDateKey(new Date("2026-10-25T20:59:59Z"))).toBe("2026-10-25");
    expect(egyptDateKey(new Date("2026-10-25T21:00:00Z"))).toBe("2026-10-26");
  });
  it("uses winter time rather than a fixed UTC offset", () => {
    expect(egyptDateKey(new Date("2026-12-01T21:59:59Z"))).toBe("2026-12-01");
    expect(egyptDateKey(new Date("2026-12-01T22:00:00Z"))).toBe("2026-12-02");
  });
});
