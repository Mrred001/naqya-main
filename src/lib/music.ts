import type { MusicStatus } from "./content";

export type MusicChoice = MusicStatus | "";

/** Explicit ranges, one per line. Example: 00:00-00:18 */
export function parseMusicSkipRanges(raw: string): Array<{ start: number; end: number; label: string }> | null {
  if (!raw.trim()) return [];
  const toSeconds = (value: string) => {
    const digits = value.split(":").map(Number);
    if (digits.some((n) => !Number.isFinite(n)) || digits.some((n) => n < 0)) return null;
    if (digits.length === 2) {
      if (digits[1] >= 60) return null;
      return digits[0] * 60 + digits[1];
    }
    if (digits.length === 3) {
      if (digits[1] >= 60 || digits[2] >= 60) return null;
      return digits[0] * 3600 + digits[1] * 60 + digits[2];
    }
    return null;
  };
  const rows = raw.split(/[\n,،]+/).map((x) => x.trim()).filter(Boolean);
  const ranges: Array<{ start: number; end: number; label: string }> = [];
  for (const row of rows) {
    const match = row.match(/^(\d{1,3}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{1,3}:\d{2}(?::\d{2})?)$/);
    if (!match) return null;
    const start = toSeconds(match[1]);
    const end = toSeconds(match[2]);
    if (start === null || end === null || end <= start) return null;
    ranges.push({ start, end, label: `${match[1]} – ${match[2]}` });
  }
  return ranges;
}

export function validateMusicSelection(status: MusicChoice, ranges: string, isVideo: boolean): string | null {
  if (!status) return "Choose a music level after reviewing the resource.";
  if (status !== "minimal_music") return null;
  const parsed = parseMusicSkipRanges(ranges);
  if (!parsed) return "Use MM:SS-MM:SS timestamps, one range per line, with end after start.";
  if (isVideo && parsed.length === 0) return "Add the music start/end times so viewers know what to skip.";
  return null;
}
