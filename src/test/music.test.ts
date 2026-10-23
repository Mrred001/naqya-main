import { describe, expect, it } from "vitest";
import { parseMusicSkipRanges, validateMusicSelection } from "@/lib/music";

describe("curated music classification", () => {
  it("parses one or multiple timestamp ranges", () => {
    expect(parseMusicSkipRanges("00:00-00:18\n12:40-13:05")?.map(({ start, end }) => [start, end]))
      .toEqual([[0, 18], [760, 785]]);
  });
  it("rejects invalid timestamps or reversed ranges", () => {
    expect(parseMusicSkipRanges("00:40-00:20")).toBeNull();
    expect(parseMusicSkipRanges("00:75-01:20")).toBeNull();
    expect(parseMusicSkipRanges("start to end")).toBeNull();
  });
  it("requires explicit classification and skip ranges for an individual video", () => {
    expect(validateMusicSelection("", "", true)).toBeTruthy();
    expect(validateMusicSelection("minimal_music", "", true)).toBeTruthy();
    expect(validateMusicSelection("minimal_music", "00:00-00:12", true)).toBeNull();
    expect(validateMusicSelection("minimal_music", "", false)).toBeNull();
    expect(validateMusicSelection("no_music", "", true)).toBeNull();
  });
});
