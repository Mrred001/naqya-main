import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, TrendingUp, ArrowUpRight, Video, ListVideo } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { SaveButton } from "@/components/account/SaveButton";
import { parseYouTube } from "@/lib/content";
import { popularFcdsQuery, recentFcdsQuery, recordFcdsOpen } from "@/lib/fcds-discovery";

export function FcdsDiscovery() {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => english ? en : ar;
  const [active, setActive] = useState<"recent" | "popular" | null>(null);
  const recent = useQuery({ ...recentFcdsQuery, enabled: active === "recent" });
  const popular = useQuery({ ...popularFcdsQuery, enabled: active === "popular" });
  const query = active === "popular" ? popular : recent;
  const title = active === "popular" ? t("الأكثر مشاهدة", "Most viewed") : t("أُضيف حديثاً", "Recently added");

  return (
    <section className="mb-8" aria-label={t("اكتشف مصادر درب", "Discover DARB resources")} dir={english ? "ltr" : "rtl"}>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { key: "recent", icon: Clock3, title: t("أُضيف حديثاً", "Recently added"), subtitle: t("اكتشف آخر 3 مصادر انضافت", "Discover the latest 3 resources"), color: "text-sky-400 bg-sky-400/10" },
          { key: "popular", icon: TrendingUp, title: t("الأكثر مشاهدة", "Most viewed"), subtitle: t("أكثر 3 فيديوهات الناس بترجع ليها", "The top 3 videos people return to"), color: "text-violet-400 bg-violet-400/10" },
        ] as const).map(({ key, icon: Icon, title: label, subtitle, color }) => (
          <button key={key} type="button" onClick={() => setActive(key)} aria-haspopup="dialog"
            className="group flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-start transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block text-base font-bold">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span></span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>
      <Dialog open={active !== null} onOpenChange={(open) => { if (!open) setActive(null); }}>
        <DialogContent className="fcds-theme max-h-[85dvh] overflow-y-auto rounded-2xl bg-background sm:max-w-xl" dir={english ? "ltr" : "rtl"}>
          <DialogTitle className="px-6 text-xl">{title}</DialogTitle>
          <DialogDescription>{active === "popular"
            ? t("حسب فتح الفيديوهات من درب، مع احتساب الرجوع لها لاحقاً.", "Based on video opens from DARB, including later return visits.")
            : t("آخر الإضافات من كل مواد درب، فيديوهات وقوائم تشغيل.", "The latest videos and playlists across all DARB courses.")}</DialogDescription>
          {query.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("جاري التحميل…", "Loading…")}</p>
            : query.isError ? <div role="alert" className="py-6 text-center text-sm"><p>{t("ما قدرنا نحمّل المصادر.", "Could not load resources.")}</p><button type="button" onClick={() => { void query.refetch(); }} className="mt-3 text-primary underline">{t("حاول تاني", "Try again")}</button></div>
            : !query.data?.length ? <p className="py-8 text-center text-sm leading-7 text-muted-foreground">{active === "popular" ? t("لسه ما في مشاهدات مسجّلة. الفيديوهات الأكثر فتحاً حتظهر هنا مع الاستخدام.", "No views recorded yet. The most opened videos will appear here as people use DARB.") : t("لسه ما انضافت مصادر.", "No resources have been added yet.")}</p>
            : <div className="space-y-3 pt-2">{query.data.map((resource) => {
              const parsed = parseYouTube(resource.youtube_url);
              const thumbnail = resource.thumbnail_url || (parsed?.kind === "video" ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : null);
              return <article key={resource.id} className="rounded-xl border border-border p-3">
                <a href={resource.youtube_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => { void recordFcdsOpen(resource.id); }}
                  onAuxClick={(event) => { if (event.button === 1) void recordFcdsOpen(resource.id); }}
                  className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <ResourceThumbnail url={thumbnail} />
                  <span className="min-w-0 flex-1"><span dir="auto" className="line-clamp-2 block text-sm font-semibold leading-6">{resource.title}</span><span dir="auto" className="mt-1 block truncate text-xs text-muted-foreground">{resource.channel || "YouTube"}</span><span className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Video className="h-3 w-3" />{parsed?.kind === "playlist" ? t("قائمة تشغيل", "Playlist") : t("شاهد الفيديو", "Watch video")}</span></span>
                </a>
                <div className="mt-3"><SaveButton kind="fcds" id={resource.id} /></div>
              </article>;
            })}</div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ResourceThumbnail({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent sm:w-32">
      {url && !failed
        ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <ListVideo className="h-6 w-6 text-primary" aria-hidden="true" />}
    </span>
  );
}
