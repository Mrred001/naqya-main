import { expect, it } from "vitest";
import { socialMeta } from "@/lib/social-meta";
it("provides approved square artwork for the brands and keeps the gateway preview", () => {
  for (const brand of ["darb", "naqya", "gateway"] as const) {
    const meta = socialMeta(brand);
    expect(meta.find((m) => m.property === "og:image")?.content).toBe(
      `https://naqya-main.vercel.app/social/${brand === "gateway" ? "gateway-v1.png" : `${brand}-v2.jpg`}`,
    );
    expect(meta.find((m) => m.property === "og:image:width")?.content).toBe("1200");
    expect(meta.find((m) => m.property === "og:image:height")?.content).toBe(
      brand === "gateway" ? "630" : "1200",
    );
    expect(meta.find((m) => m.property === "og:image:type")?.content).toBe(
      brand === "gateway" ? "image/png" : "image/jpeg",
    );
    expect(meta.find((m) => m.name === "twitter:card")?.content).toBe("summary_large_image");
  }
});
