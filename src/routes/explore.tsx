import type { ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { categoriesQuery, contentQuery } from "@/lib/content";
import { ContentCard } from "@/components/site/ContentCard";
import { SearchBar } from "@/components/site/SearchBar";
import { cn } from "@/lib/utils";

type S = string | undefined;
type Search = { q?: S; category?: S; language?: S; duration?: S; type?: S; sort?: S };
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: str(s["q"]), category: str(s["category"]), language: str(s["language"]),
    duration: str(s["duration"]), type: str(s["type"]), sort: str(s["sort"]),
  }),
  head: () => ({
    meta: [
      { title: "استكشف — NAQYA نقيا" },
      { name: "description", content: "اكتشف محتوى منتقى يستحق وقتك: فيديوهات وقوائم تشغيل مختارة بعناية." },
      { property: "og:title", content: "استكشف — NAQYA نقيا" },
      { property: "og:description", content: "اكتشف محتوى منتقى يستحق وقتك." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(contentQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  component: Explore,
});

const DURATIONS: Record<string, [number, number]> = { short: [0, 900], medium: [900, 3600], long: [3600, Infinity] };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200",
        active ? "border-primary-strong bg-primary-strong text-foreground" : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Explore() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const { data: items } = useSuspenseQuery(contentQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const languages = useMemo(() => [...new Set(items.map((i) => i.language))].sort(), [items]);

  const set = (patch: Partial<Search>) => navigate({ search: (p) => ({ ...p, ...patch }), replace: true });
  const toggle = (k: keyof Search, v: string) => set({ [k]: search[k] === v ? undefined : v });

  const filtered = useMemo(() => {
    const q = search.q?.toLowerCase().trim();
    const list = items.filter((i) => {
      if (q && ![i.title, i.channel, i.category?.name ?? "", ...i.tags].some((t) => t.toLowerCase().includes(q))) return false;
      if (search.category && i.category?.slug !== search.category) return false;
      if (search.language && i.language !== search.language) return false;
      if (search.type && i.content_type !== search.type) return false;
      const d = search.duration && DURATIONS[search.duration];
      if (d && !(i.duration_seconds >= d[0] && i.duration_seconds < d[1])) return false;
      return true;
    });
    if (search.sort === "oldest") list.reverse();
    return list;
  }, [items, search]);

  const groups: { label: string; key: keyof Search; options: [string, string][] }[] = [
    { label: "اللغة", key: "language", options: languages.map((l) => [l, l]) },
    { label: "المدة", key: "duration", options: [["short", "أقل من ١٥ دقيقة"], ["medium", "١٥–٦٠ دقيقة"], ["long", "أكثر من ساعة"]] },
    { label: "النوع", key: "type", options: [["video", "فيديو"], ["playlist", "قائمة تشغيل"]] },
    { label: "الترتيب", key: "sort", options: [["oldest", "الأقدم أولاً"]] },
  ];
  const hasFilters = Object.values(search).some(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-12 md:px-8 md:pt-20">
      <h1 className="text-5xl font-bold md:text-7xl">استكشف</h1>
      <p className="mt-4 text-lg text-muted-foreground">اكتشف محتوى منتقى يستحق وقتك.</p>
      <SearchBar initial={search.q ?? ""} onChange={(q) => set({ q: q || undefined })} className="mt-8 max-w-2xl" />

      <section className="mt-10">
        <h2 className="text-xs font-medium tracking-[0.15em] text-muted-foreground">التصنيفات</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
          <Chip active={!search.category} onClick={() => set({ category: undefined })}>الكل</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={search.category === c.slug} onClick={() => toggle("category", c.slug)}>
              <span dir="auto">{c.name}</span>
            </Chip>
          ))}
        </div>
      </section>

      <details className="group mt-6 border-y py-4">
        <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground">
          تصفية إضافية <span className="inline-block transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-5 space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-3 md:flex-row md:items-center">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{g.label}</span>
              <div className="flex flex-wrap gap-2">
                {g.options.map(([v, l]) => (
                  <Chip key={v} active={search[g.key] === v} onClick={() => toggle(g.key, v)}><span dir="auto">{l}</span></Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} نتيجة</span>
        {hasFilters && (
          <button onClick={() => navigate({ search: {}, replace: true })} className="hover:text-foreground">مسح الكل</button>
        )}
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => <ContentCard key={i.id} item={i} />)}
        </div>
      ) : (
        <p className="py-24 text-center text-2xl text-muted-foreground">لا يوجد محتوى مطابق بعد.</p>
      )}
    </div>
  );
}
