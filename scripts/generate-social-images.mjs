// DARB and NAQYA use approved artwork: public/social/*-v2.jpg.
// This generator only maintains the separate gateway image; it must not overwrite the approved brand art.
// Run with `node scripts/generate-social-images.mjs` using the repository's sharp dependency.
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
const darb = await readFile(new URL("../public/naqya-fcds-logo.png", import.meta.url));
const naqya = await readFile(new URL("../public/naqya-logo-icon.svg", import.meta.url));
const image = (buffer, mime, x, y, w, h) =>
  `<image href="data:${mime};base64,${buffer.toString("base64")}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const text = (x, y, size, color, value) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="DejaVu Sans" font-size="${size}" font-weight="600" fill="${color}">${value}</text>`;
const shell = (background, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${background}"/>${body}</svg>`;
const cards = {
  gateway: shell(
    "#0c1010",
    `<path d="M600 95V480" stroke="#32403c" stroke-width="2"/>` +
      image(darb, "image/png", 185, 90, 230, 190) +
      image(naqya, "image/svg+xml", 760, 120, 280, 130) +
      text(300, 345, 48, "#8beab5", "DARB · درب") +
      text(900, 345, 48, "#e6ddff", "NAQYA · نقيا") +
      text(600, 455, 30, "#dce5df", "اختر مكتبتك — ما يستحق وقتك، بلا تشتت") +
      text(600, 560, 21, "#94a09a", "naqya-main.vercel.app"),
  ),
};
await mkdir(new URL("../public/social/", import.meta.url), { recursive: true });
for (const [name, svg] of Object.entries(cards))
  await sharp(Buffer.from(svg))
    .png()
    .toFile(new URL(`../public/social/${name}-v1.png`, import.meta.url).pathname);
