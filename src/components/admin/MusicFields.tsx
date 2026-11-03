import type { ContentKind, MusicStatus } from "@/lib/content";
import type { MusicChoice } from "@/lib/music";

const field =
  "w-full rounded-xl border border-amber-200/15 bg-amber-100/[0.035] px-4 py-2.5 text-sm text-amber-50 outline-none transition-colors focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/10";

export function MusicFields({
  status,
  ranges,
  onStatusChange,
  onRangesChange,
}: {
  status: MusicChoice;
  ranges: string;
  kind: ContentKind;
  onStatusChange: (status: MusicChoice) => void;
  onRangesChange: (ranges: string) => void;
}) {
  const select = (next: MusicChoice) => {
    onStatusChange(next);
    if (next !== "minimal_music") onRangesChange("");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-4 md:col-span-2">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-amber-100/60">Music level *</span>
        <select
          required
          className={field}
          value={status}
          onChange={(event) => select(event.target.value as MusicStatus | "")}
        >
          <option value="">Choose after reviewing the audio</option>
          <option value="no_music">No Music — no instrumental music detected</option>
          <option value="minimal_music">Minimal Music — short, skippable parts only</option>
          {status === "has_music" && (
            <option value="has_music">Has Music (legacy classification — review required)</option>
          )}
        </select>
      </label>
      {status === "minimal_music" && (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-amber-100/75">
            Skip the sections containing music. Notes are optional and will be shown as written.
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-[0.16em] text-amber-100/60">
              Music notes (optional)
            </span>
            <textarea
              className={field}
              rows={3}
              value={ranges}
              onChange={(event) => onRangesChange(event.target.value)}
              placeholder={"مثلاً: في موسيقى آخر 25 ثانية؛ تخطى النهاية."}
              aria-describedby="music-ranges-help"
            />
            <span id="music-ranges-help" className="block text-xs text-amber-100/50">
              Free text — Arabic, English, times, or any helpful note. Leave blank if you wish.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
