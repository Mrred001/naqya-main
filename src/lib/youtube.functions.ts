import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type YouTubeMeta = {
  title: string;
  channel: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  source: "api" | "oembed";
};

const iso = (d: string) => {
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const [, D, H, M, S] = m.map((x) => Number(x ?? 0));
  return (D ?? 0) * 86400 + (H ?? 0) * 3600 + (M ?? 0) * 60 + (S ?? 0);
};

type Thumbs = Record<string, { url: string } | undefined>;
const bestThumb = (t: Thumbs) => (t["maxres"] ?? t["standard"] ?? t["high"] ?? t["medium"] ?? t["default"])?.url ?? "";

export const fetchYouTubeMeta = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(1).max(100), kind: z.enum(["video", "playlist"]) }).parse(d))
  .handler(async ({ data }): Promise<{ meta: YouTubeMeta | null; error?: string }> => {
    const key = process.env["YOUTUBE_API_KEY"];
    try {
      if (key) {
        const endpoint = data.kind === "video" ? "videos?part=snippet,contentDetails" : "playlists?part=snippet";
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}&id=${encodeURIComponent(data.id)}&key=${key}`);
        if (res.ok) {
          const json = (await res.json()) as {
            items?: { snippet: { title: string; channelTitle: string; thumbnails: Thumbs }; contentDetails?: { duration?: string } }[];
          };
          const item = json.items?.[0];
          if (!item) return { meta: null, error: "Video not found on YouTube." };
          return {
            meta: {
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              thumbnail_url: bestThumb(item.snippet.thumbnails),
              duration_seconds: item.contentDetails?.duration ? iso(item.contentDetails.duration) : null,
              source: "api",
            },
          };
        }
        console.error("YouTube API error", res.status, await res.text());
      }
      // Fallback without a key: title, channel, thumbnail (no duration)
      const url = data.kind === "video" ? `https://www.youtube.com/watch?v=${data.id}` : `https://www.youtube.com/playlist?list=${data.id}`;
      const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
      if (!o.ok) return { meta: null, error: "Couldn't fetch details for this link." };
      const j = (await o.json()) as { title: string; author_name: string; thumbnail_url: string };
      return { meta: { title: j.title, channel: j.author_name, thumbnail_url: j.thumbnail_url, duration_seconds: null, source: "oembed" } };
    } catch (e) {
      console.error(e);
      return { meta: null, error: "Couldn't reach YouTube." };
    }
  });
