import { ExternalLink, Calculator } from "lucide-react";
import { type DarbResource } from "@/lib/darb-resources";
import { parseYouTube } from "@/lib/content";
import { recordFcdsOpen } from "@/lib/fcds-discovery";
import { MusicNotice } from "@/components/site/MusicNotice";
import { SaveButton } from "@/components/account/SaveButton";
import { ResourceProgress } from "@/components/account/ResourceProgress";
import { ShareButton } from "@/components/site/ShareButton";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
export function DarbResourceCard({
  resource,
  courseSlug,
  note,
}: {
  resource: DarbResource;
  courseSlug?: string;
  note?: string | null;
}) {
  const { language } = useSitePreferences();
  const en = language === "en";
  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <MusicNotice
        status={resource.music_reviewed_at ? resource.music_status : null}
        skipRanges={resource.music_skip_ranges}
      />
      {note && (
        <p
          dir="auto"
          className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
        >
          {note}
        </p>
      )}
      <a
        href={resource.youtube_url}
        target="_blank"
        rel="noreferrer"
        onClick={() => void recordFcdsOpen(resource.id, courseSlug)}
        onAuxClick={(e) => {
          if (e.button === 1) void recordFcdsOpen(resource.id, courseSlug);
        }}
        className="group flex min-w-0 items-start gap-4 rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="text-lg font-semibold group-hover:text-primary">
            {resource.title}
          </h3>
          <p dir="auto" className="mt-1 text-sm text-muted-foreground">
            {resource.channel || "YouTube"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              {parseYouTube(resource.youtube_url)?.kind === "video"
                ? en
                  ? "Video"
                  : "فيديو"
                : en
                  ? "Playlist"
                  : "قائمة تشغيل"}
            </span>
            <span>· {resource.language}</span>
            {resource.calculator_guide && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <Calculator className="h-3 w-3" />
                {resource.calculator_model}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </a>
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton kind="fcds" id={resource.id} />
        <ShareButton
          library="fcds"
          resourceId={resource.id}
          title={resource.title}
          {...(courseSlug ? { courseSlug } : {})}
        />
        <ResourceProgress id={resource.id} />
      </div>
    </article>
  );
}
