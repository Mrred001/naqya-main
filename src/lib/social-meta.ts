const origin = "https://naqya-main.vercel.app";
export function socialMeta(
  brand: "darb" | "naqya" | "gateway",
  title?: string,
  description?: string,
) {
  const name = brand === "darb" ? "درب FCDS" : brand === "naqya" ? "NAQYA نقيا" : "NAQYA & DARB";
  const heading =
    title ??
    (brand === "darb"
      ? "درب FCDS — مصادر مادتك، بلا تشتت"
      : brand === "naqya"
        ? "نقيا — ما يستحق وقتك"
        : "نقيا ودرب — اختر مكتبتك");
  const summary =
    description ??
    (brand === "darb"
      ? "فيديوهات وقوائم تشغيل منتقاة لموادك، مع توضيح حالة الموسيقى."
      : brand === "naqya"
        ? "محتوى منتقى بعناية، يستحق وقتك."
        : "نقيا للمحتوى المفيد ودرب لمصادر مواد FCDS.");
  const image = `${origin}/social/${brand}-v1.png`;
  return [
    { property: "og:site_name", content: name },
    { property: "og:title", content: heading },
    { property: "og:description", content: summary },
    { property: "og:locale", content: "ar_EG" },
    { property: "og:image", content: image },
    { property: "og:image:secure_url", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: heading },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: heading },
    { name: "twitter:description", content: summary },
    { name: "twitter:image", content: image },
  ];
}
