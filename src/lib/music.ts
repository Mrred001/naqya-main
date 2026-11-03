import type { MusicStatus } from "./content";

export type MusicChoice = MusicStatus | "";

/** Explicit ranges, one per line. Example: 00:00-00:18 */
export function parseMusicSkipRanges(
  raw: string,
): Array<{ start: number; end: number; label: string }> | null {
  if (!raw.trim()) return [];
  const toSeconds = (value: string) => {
    const digits = value.split(":").map(Number);
    if (digits.some((n) => !Number.isFinite(n)) || digits.some((n) => n < 0)) return null;
    const [first, second, third] = digits;
    if (first === undefined || second === undefined) return null;
    if (digits.length === 2) {
      if (second >= 60) return null;
      return first * 60 + second;
    }
    if (digits.length === 3 && third !== undefined) {
      if (second >= 60 || third >= 60) return null;
      return first * 3600 + second * 60 + third;
    }
    return null;
  };
  const rows = raw
    .split(/[\n,،]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const ranges: Array<{ start: number; end: number; label: string }> = [];
  for (const row of rows) {
    const match = row.match(/^(\d{1,3}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{1,3}:\d{2}(?::\d{2})?)$/);
    if (!match || !match[1] || !match[2]) return null;
    const start = toSeconds(match[1]);
    const end = toSeconds(match[2]);
    if (start === null || end === null || end <= start) return null;
    ranges.push({ start, end, label: `${match[1]} – ${match[2]}` });
  }
  return ranges;
}

/** Curator notes are free-form and optional. Only a classification is required. */
export function validateMusicSelection(
  status: MusicChoice,
  _notes: string,
  _isVideo: boolean,
): string | null {
  return status ? null : "Choose a music level after reviewing the resource.";
}
