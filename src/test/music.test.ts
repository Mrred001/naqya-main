import { describe, expect, it } from "vitest";
import { parseMusicSkipRanges, validateMusicSelection } from "@/lib/music";

describe("curated music classification", () => {
  it("parses one or multiple timestamp ranges", () => {
    expect(
      parseMusicSkipRanges("00:00-00:18\n12:40-13:05")?.map(({ start, end }) => [start, end]),
    ).toEqual([
      [0, 18],
      [760, 785],
    ]);
  });
  it("rejects invalid timestamps or reversed ranges", () => {
    expect(parseMusicSkipRanges("00:40-00:20")).toBeNull();
    expect(parseMusicSkipRanges("00:75-01:20")).toBeNull();
    expect(parseMusicSkipRanges("start to end")).toBeNull();
  });
  it("requires a music classification but accepts arbitrary or empty notes", () => {
    expect(validateMusicSelection("", "", true)).toBeTruthy();
    expect(validateMusicSelection("minimal_music", "", true)).toBeNull();
    expect(validateMusicSelection("minimal_music", "في موسيقى آخر 25 ثانية", true)).toBeNull();
    expect(validateMusicSelection("minimal_music", "Intro only — skip to 1:12", false)).toBeNull();
    expect(validateMusicSelection("no_music", "", true)).toBeNull();
  });
});
