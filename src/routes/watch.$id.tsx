import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { contentQuery, embedFor, formatDuration } from "@/lib/content";
import { ContentCard, Pill } from "@/components/site/ContentCard";

export const Route = createFileRoute("/watch/$id")({
  loader: async ({ context, params }) => {
    const items = await context.queryClient.ensureQueryData(contentQuery);
    const item = items.find((i) => i.id === params.id);
    if (!item) throw notFound();
    return { title: item.title, description: item.recommendation ?? `${item.title} — ${item.channel}`, thumb: item.thumbnail_url };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "غير موجود — NAQYA نقيا" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.title} — NAQYA نقيا`;
    const meta: Array<Record<string, string>> = [
      { title: t },
      { name: "description", content: loaderData.description },
      { property: "og:title", content: t },
      { property: "og:description", content: loaderData.description },
      { property: "og:type", content: "video.other" },
    ];
    if (loaderData.thumb?.startsWith("https://")) {
      meta.push({ property: "og:image", content: loaderData.thumb }, { name: "twitter:image", content: loaderData.thumb });
    }
    return { meta };
  },
  notFoundComponent: WatchNotFound,
  component: Watch,
});

function WatchNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-32 text-center">
      <h1 className="text-4xl font-bold">هذا المحتوى غير موجود في المكتبة.</h1>
      <Link to="/explore" className="mt-6 inline-block text-primary">تصفّح المكتبة</Link>
    </div>
  );
}

function Watch() {
  const { id } = Route.useParams();
  const { data: items } = useSuspenseQuery(contentQuery);
  const item = items.find((i) => i.id === id)!;
  const related = items
    .filter((i) => i.id !== item.id)
    .map((i) => ({
      i,
      score:
        (i.category_id && i.category_id === item.category_id ? 3 : 0) +
        (i.channel === item.channel ? 2 : 0) +
        i.tags.filter((t) => item.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.i);

  const meta = [
    item.category?.name,
    formatDuration(item.duration_seconds),
    item.content_type === "playlist" ? "قائمة تشغيل" : "فيديو",
    item.language,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl pt-4 md:px-8 md:pt-8">
      <Link to="/explore" className="mx-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:mx-0">
        <ArrowRight className="h-4 w-4" /> العودة إلى المكتبة
      </Link>
      <div className="mt-4 aspect-video overflow-hidden bg-card md:rounded-2xl md:border">
        <iframe
          src={embedFor(item)}
          title={item.title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="px-5 md:px-0">
        <h1 dir="auto" className="mt-6 text-3xl font-bold leading-tight md:text-4xl">{item.title}</h1>
        <p dir="auto" className="mt-2 text-lg text-muted-foreground">{item.channel}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {meta.map((m, idx) => (
            <span key={idx} className="flex items-center gap-3">
              {idx > 0 && <span className="opacity-40">·</span>}
              <span dir="auto">{m}</span>
            </span>
          ))}
          <a href={item.youtube_url} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1.5 hover:text-primary">
            فتح في يوتيوب <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {item.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.tags.map((t) => <Pill key={t}><span dir="auto">{t}</span></Pill>)}
          </div>
        )}

        {item.recommendation && (
          <section className="mt-8 rounded-2xl border border-primary/20 bg-primary-soft p-6 md:p-8">
            <h2 className="text-sm font-semibold text-primary">لماذا يرشحه أحمد؟</h2>
            <p dir="auto" className="mt-3 text-lg leading-relaxed md:text-xl">{item.recommendation}</p>
            <div className="mt-6 flex items-center gap-3 border-t border-primary/15 pt-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-strong text-sm font-semibold text-foreground">أ</span>
              <div className="leading-tight">
                <p className="text-sm font-medium">أحمد أسامة</p>
                <p className="text-xs text-muted-foreground" dir="ltr">Founder &amp; Curator</p>
              </div>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-16 md:mt-20">
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">قد يعجبك أيضاً</h2>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((i) => <ContentCard key={i.id} item={i} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
