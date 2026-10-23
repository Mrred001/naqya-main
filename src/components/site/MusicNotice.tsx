import { AlertTriangle } from "lucide-react";
import type { MusicStatus } from "@/lib/content";
import { parseMusicSkipRanges } from "@/lib/music";
import { useSitePreferences } from "./PreferencesProvider";

/** Warning appears before watching (NAQYA) or opening a YouTube link (Darb). */
export function MusicNotice({
  status,
  skipRanges,
}: {
  status?: MusicStatus | null | undefined;
  skipRanges?: string | null | undefined;
}) {
  const { language } = useSitePreferences();
  if (!status || status === "no_music") return null;
  const english = language === "en";
  const minimal = status === "minimal_music";
  const segments = parseMusicSkipRanges(skipRanges ?? "");
  return (
    <aside
      role="note"
      className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm leading-relaxed text-foreground"
      dir={english ? "ltr" : "rtl"}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            {minimal
              ? english
                ? "Music notice"
                : "تنبيه: موسيقى محدودة"
              : english
                ? "Music present"
                : "تنبيه: يوجد موسيقى في المحتوى"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {minimal
              ? english
                ? "This resource contains music in short sections only. Please skip the parts containing music."
                : "المحتوى ده فيه موسيقى في أجزاء محدودة. بنوصيك تتخطى الأجزاء الفيها موسيقى."
              : english
                ? "This resource was previously marked as containing music. Please review before watching."
                : "المصدر ده كان مصنّف سابقاً إنو فيه موسيقى. راجعه قبل المشاهدة."}
          </p>
          {minimal && segments && segments.length > 0 && (
            <p className="mt-2 font-medium">
              {english ? "Skip:" : "الأجزاء المقترح تخطيها:"}{" "}
              <span dir="ltr" className="inline-block font-mono">
                {segments.map((s) => s.label).join(" · ")}
              </span>
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
