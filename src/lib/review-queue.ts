import { parseYouTube } from "./content";
import { parseMusicSkipRanges } from "./music";
export function reviewReasons(resource: {
  youtube_url: string;
  title: string;
  channel: string | null;
  music_status?: string | null;
  music_reviewed_at?: string | null;
  music_skip_ranges?: string | null;
}) {
  const reasons: string[] = [];
  const parsed = parseYouTube(resource.youtube_url);
  if (
    !resource.music_reviewed_at ||
    !["no_music", "minimal_music"].includes(resource.music_status ?? "")
  )
    reasons.push("Audio review");
  if (!parsed || !resource.title.trim() || !resource.channel?.trim())
    reasons.push("Source details");
  if (resource.music_status === "minimal_music") {
    const ranges = parseMusicSkipRanges(resource.music_skip_ranges ?? "");
    if (!ranges || (parsed?.kind === "video" && !ranges.length)) reasons.push("Music timestamps");
  }
  return reasons;
}
