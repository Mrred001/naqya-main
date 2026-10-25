import { pendingWorkQuery, type Section } from "@/lib/pending-work";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { darbResourcesQuery, type DarbResource } from "@/lib/darb-resources";
import { contentQuery, type ContentItem } from "@/lib/content";
import { reviewReasons } from "@/lib/review-queue";
import { MusicReviewDialog, type MusicReview } from "./MusicReviewDialog";
import { DarbResourceEditor } from "./DarbResourceEditor";

const button =
  "min-h-11 rounded-xl border border-amber-200/20 px-4 py-2 text-sm text-amber-100 hover:bg-amber-100/10 disabled:opacity-40";
export function ReviewQueue({
  onOpen,
  onEditGeneral,
}: {
  onOpen: (section: Section) => void;
  onEditGeneral: (item: ContentItem) => void;
}) {
  const darb = useQuery(darbResourcesQuery),
    general = useQuery(contentQuery),
    work = useQuery(pendingWorkQuery);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [reviewing, setReviewing] = useState<{
    library: "darb" | "general";
    item: DarbResource | ContentItem;
  } | null>(null);
  const [editing, setEditing] = useState<DarbResource | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const sources = [
    ...(darb.data ?? []).map((item) => ({ library: "darb" as const, item })),
    ...(general.data ?? []).map((item) => ({ library: "general" as const, item })),
  ]
    .map((r) => ({ ...r, reasons: reviewReasons(r.item) }))
    .filter((r) => r.reasons.length);
  const error = darb.error || general.error || work.error;
  async function save(review: MusicReview | null) {
    if (!review || !reviewing || busy) {
      if (!busy) setReviewing(null);
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      const result =
        reviewing.library === "darb"
          ? await supabase
              .from("fcds_playlists")
              .update(review)
              .eq("id", reviewing.item.id)
              .select("id")
              .single()
          : await supabase
              .from("content")
              .update(review)
              .eq("id", reviewing.item.id)
              .select("id")
              .single();
      if (result.error) throw result.error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["darb-resources"] }),
        qc.invalidateQueries({ queryKey: ["content"] }),
        qc.invalidateQueries({ queryKey: ["admin-overview"] }),
      ]);
      setReviewing(null);
    } catch (error) {
      setFailure((error as Error).message || "Could not save review. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  if (editing) return <DarbResourceEditor initial={editing} onDone={() => setEditing(null)} />;
  const visible = sources.filter(
    (r) =>
      (filter === "all" || r.library === filter) &&
      `${r.item.title} ${r.item.channel ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pending = (work.data ?? []).filter(
    (r) =>
      (filter === "all" || filter === "work") &&
      r["title"].toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold">Review centre · Pending</h2>
        <p className="mt-2 text-sm text-amber-100/60" dir="rtl">
          كل المصادر المحتاجة مراجعة صوت أو بيانات، والاقتراحات والطلبات والبلاغات المعلّقة.
          المراجعة ما بتتم تلقائياً.
        </p>
      </div>
      {reviewing && (
        <MusicReviewDialog
          youtubeUrl={reviewing.item.youtube_url}
          title={reviewing.item.title}
          submitLabel="Save review"
          busy={busy}
          failure={failure}
          onComplete={(r) => void save(r)}
        />
      )}
      {error && (
        <p role="alert" className="text-red-300">
          Could not load the complete queue. {error.message}{" "}
          <button
            className={button}
            onClick={() => {
              void darb.refetch();
              void general.refetch();
              void work.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {darb.isPending || general.isPending || work.isPending ? (
        <p>Loading pending reviews…</p>
      ) : (
        <p className="text-amber-200">
          {sources.length} source reviews · {work.data?.length ?? 0} pending requests / reports
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Search pending reviews"
          placeholder="Search title or channel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-amber-100/20 bg-black/20 px-4"
        />
        <select
          aria-label="Review queue filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={button + " bg-[#19160f]"}
        >
          <option value="all">All pending</option>
          <option value="darb">Darb sources</option>
          <option value="general">Naqya sources</option>
          <option value="work">Requests &amp; reports</option>
        </select>
      </div>
      <div className="space-y-3">
        {visible.map(({ item, library, reasons }) => (
          <article
            key={`${library}:${item.id}`}
            className="rounded-2xl border border-amber-100/15 p-4"
          >
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-amber-200">Pending</span>
              <span>
                {library === "darb" ? "DARB" : "NAQYA"} · {reasons.join(" · ")}
              </span>
            </div>
            <h3 dir="auto" className="mt-3 font-semibold">
              {item.title || "Untitled source"}
            </h3>
            <p className="text-sm text-amber-100/50">{item.channel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={item.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className={button}
              >
                Open YouTube
              </a>
              <button
                className={button}
                onClick={() => {
                  setFailure("");
                  setReviewing({ item, library });
                }}
              >
                Review audio
              </button>
              <button
                className={button}
                onClick={() =>
                  library === "darb"
                    ? setEditing(item as DarbResource)
                    : onEditGeneral(item as ContentItem)
                }
              >
                Edit details
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="space-y-3">
        {pending.map((r) => (
          <article
            key={r["id"]}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100/15 p-4"
          >
            <div className="min-w-0">
              <p className="text-xs text-amber-200">Pending · {r["kind"]}</p>
              <p dir="auto" className="mt-2 break-words text-sm">
                {r["title"]}
              </p>
            </div>
            <button className={button} onClick={() => onOpen(r.section)}>
              Open for review
            </button>
          </article>
        ))}
      </div>
      {!error &&
        !darb.isPending &&
        !general.isPending &&
        !work.isPending &&
        !visible.length &&
        !pending.length && <p className="text-amber-100/60">No pending items match this filter.</p>}
    </section>
  );
}
