import { expect, it } from "vitest";
import { socialMeta } from "@/lib/social-meta";
it("provides separate absolute PNG previews for DARB, NAQYA and the gateway", () => {
  for (const brand of ["darb", "naqya", "gateway"] as const) {
    const meta = socialMeta(brand);
    expect(meta.find((m) => m.property === "og:image")?.content).toBe(
      `https://naqya-main.vercel.app/social/${brand}-v1.png`,
    );
    expect(meta.find((m) => m.property === "og:image:width")?.content).toBe("1200");
    expect(meta.find((m) => m.name === "twitter:card")?.content).toBe("summary_large_image");
  }
});
