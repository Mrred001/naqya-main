import { useId, useState, type FormEvent } from "react";
import { Check, Headphones, ShieldCheck, SkipForward } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { parseYouTube } from "@/lib/content";
import { validateMusicSelection } from "@/lib/music";
import { cn } from "@/lib/utils";

export type MusicReview = {
  music_status: "no_music" | "minimal_music";
  music_skip_ranges: string | null;
  music_reviewed_at: string;
};

export function MusicReviewDialog({
  youtubeUrl,
  title,
  onComplete,
}: {
  youtubeUrl: string;
  title: string;
  onComplete: (review: MusicReview | null) => void;
}) {
  const [status, setStatus] = useState<MusicReview["music_status"] | "">("");
  const [ranges, setRanges] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const rangesId = useId();
  const isVideo = parseYouTube(youtubeUrl)?.kind === "video";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = validateMusicSelection(status, ranges, isVideo);
    if (message || !status) {
      setError(message);
      return;
    }
    onComplete({
      music_status: status,
      music_skip_ranges: status === "minimal_music" ? ranges.trim() || null : null,
      music_reviewed_at: new Date().toISOString(),
    });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    >
      <DialogContent
        dir="ltr"
        className="admin-theme max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-amber-200/15 bg-[#100e09] p-5 text-amber-50 shadow-2xl sm:p-7"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <Headphones className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-2 pr-5">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Review music level
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-amber-100/55">
            Choose a classification after checking the audio. Your selection will appear with this
            resource.
          </DialogDescription>
        </div>
        <p
          dir="auto"
          className="break-words rounded-xl border border-amber-100/10 bg-amber-100/[0.03] px-4 py-3 text-sm font-medium text-amber-100/80"
        >
          {title}
        </p>
        <form onSubmit={submit} className="space-y-5">
          <fieldset className="space-y-3" aria-describedby={error ? errorId : undefined}>
            <legend className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-amber-100/50">
              Music level
            </legend>
            {(
              [
                {
                  value: "no_music",
                  label: "No Music",
                  description: "Reviewed — no instrumental music.",
                  icon: ShieldCheck,
                },
                {
                  value: "minimal_music",
                  label: "Minimal Music",
                  description: "Short, skippable music sections only.",
                  icon: SkipForward,
                },
              ] as const
            ).map(({ value, label, description, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-amber-300/50",
                  status === value
                    ? "border-amber-300/60 bg-amber-300/10"
                    : "border-amber-100/15 bg-amber-100/[0.02] hover:border-amber-200/35",
                )}
              >
                <input
                  type="radio"
                  name="music-level"
                  value={value}
                  checked={status === value}
                  onChange={() => {
                    setStatus(value);
                    setError(null);
                    if (value === "no_music") setRanges("");
                  }}
                  className="sr-only"
                />
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-amber-100/55">
                    {description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    status === value
                      ? "border-amber-300 bg-amber-300 text-[#17130a]"
                      : "border-amber-100/25",
                  )}
                >
                  {status === value && <Check className="h-3 w-3" />}
                </span>
              </label>
            ))}
          </fieldset>
          {status === "minimal_music" && (
            <div className="space-y-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
              <p className="text-xs leading-relaxed text-amber-100/65">
                Viewers will see a notice recommending that they skip music sections.
                {!isVideo && " Playlist timings vary by video, so the notice will be general."}
              </p>
              {isVideo && (
                <div className="space-y-2">
                  <label htmlFor={rangesId} className="block text-sm font-medium">
                    Music timestamps
                  </label>
                  <textarea
                    id={rangesId}
                    value={ranges}
                    onChange={(event) => {
                      setRanges(event.target.value);
                      setError(null);
                    }}
                    rows={3}
                    placeholder={"00:00-00:18\n12:40-13:05"}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full rounded-xl border border-amber-200/20 bg-black/20 px-3 py-2.5 font-mono text-sm outline-none focus:border-amber-300/60"
                  />
                  <p className="text-xs text-amber-100/45">
                    Use MM:SS-MM:SS, one segment per line.
                  </p>
                </div>
              )}
            </div>
          )}
          {error && (
            <p id={errorId} role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-amber-100/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onComplete(null)}
              className="min-h-11 rounded-xl border border-amber-200/15 px-5 py-3 text-sm text-amber-100/70 hover:border-amber-200/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!status}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-[#17130a] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Approve &amp; add
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
