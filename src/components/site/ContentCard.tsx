import { SaveButton } from "@/components/account/SaveButton";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ListVideo, Play } from "lucide-react";
import { formatDuration, thumbFor, type ContentItem } from "@/lib/content";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "./PreferencesProvider";

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "quiet" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "default" && "bg-secondary text-muted-foreground",
        tone === "quiet" && "bg-quiet text-quiet-foreground",
        tone === "primary" && "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function ContentCard({
  item,
  size = "md",
  showSave = true,
}: {
  item: ContentItem;
  size?: "md" | "lg";
  showSave?: boolean;
}) {
  const { language } = useSitePreferences();
  const playlistLabel = language === "en" ? "Playlist" : "قائمة تشغيل";
  const videoLabel = language === "en" ? "Video" : "فيديو";
  const thumb = thumbFor(item);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Link
        to="/watch/$id"
        params={{ id: item.id }}
        className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-video overflow-hidden rounded-2xl border bg-card transition-colors duration-200 group-hover:border-primary/40">
          {(!thumb || failedSrc === thumb) && (
            <div className="grid h-full place-items-center bg-primary-soft text-primary">
              <ListVideo size={40} aria-hidden="true" />
            </div>
          )}
          {thumb && failedSrc !== thumb && (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              onError={() => setFailedSrc(thumb)}
              className="h-full w-full object-cover transition-transform duration-250 ease-out group-hover:scale-[1.02]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-90" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            {item.content_type === "playlist" && <Pill tone="primary">{playlistLabel}</Pill>}
          </div>
          <span className="glass absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-medium">
            {formatDuration(item.duration_seconds)}
          </span>
          <span className="glass absolute bottom-3 left-3 grid h-9 w-9 scale-90 place-items-center rounded-full opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
            {item.content_type === "playlist" ? (
              <ListVideo className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </span>
        </div>
        <div className="mt-4 space-y-2 px-0.5">
          <h3
            dir="auto"
            className={cn(
              "font-display font-semibold leading-snug text-foreground transition-colors group-hover:text-primary",
              size === "lg" ? "text-2xl" : "text-base",
            )}
          >
            {item.title}
          </h3>
          <p dir="auto" className="text-sm text-muted-foreground">
            {item.channel}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.category && (
              <Pill>
                <span dir="auto">{item.category.name}</span>
              </Pill>
            )}
            <Pill>{item.content_type === "playlist" ? playlistLabel : videoLabel}</Pill>
          </div>
        </div>
      </Link>
      {showSave && <SaveButton kind="general" id={item.id} />}
    </div>
  );
}
