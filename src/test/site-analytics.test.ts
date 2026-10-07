import { describe, expect, it } from "vitest";
import { khartoumDateKey } from "@/lib/site-analytics";

describe("Khartoum analytics date", () => {
  it("uses the local day when UTC has already crossed midnight", () => {
    expect(khartoumDateKey(new Date("2026-10-07T22:30:00.000Z"))).toBe(
      "2026-10-08",
    );
  });
});
