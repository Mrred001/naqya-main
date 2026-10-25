import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { darbResourcesQuery, darbCoursesQuery, type DarbResource } from "@/lib/darb-resources";
import { DarbResourceEditor } from "./DarbResourceEditor";
export function DarbResourceAdmin({ calculator = false }: { calculator?: boolean }) {
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<DarbResource | null>(null);
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from("fcds_playlists").delete().eq("id", deleting.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeleting(null);
    void qc.invalidateQueries();
    toast.success("Source deleted");
  }
  const resources = useQuery(darbResourcesQuery);
  const courses = useQuery(darbCoursesQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DarbResource | "new" | null>(null);
  if (editing)
    return (
      <DarbResourceEditor
        initial={editing === "new" ? {} : editing}
        calculator={calculator}
        onDone={() => setEditing(null)}
      />
    );
  const items = (resources.data ?? []).filter(
    (r) =>
      (!calculator || r.calculator_guide) &&
      `${r.title} ${r.channel ?? ""} ${r.calculator_model ?? ""} ${r.course_links.map((l) => courses.data?.find((c) => c.slug === l.course_slug)?.name ?? l.course_slug).join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent className="border-amber-100/20 bg-[#17140d] text-amber-50">
          <AlertDialogTitle>Delete source everywhere?</AlertDialogTitle>
          <AlertDialogDescription className="break-words text-amber-100/60">
            {deleting?.title} will be permanently removed from all courses and the calculator guide,
            including saved items and progress. To remove it from one course only, cancel and edit
            its course checklist.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="min-h-11 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete everywhere"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {calculator ? "Calculator guide" : "DARB library"}
          </h2>
          <p className="mt-2 text-sm text-amber-100/50">
            {calculator
              ? "Manage calculator tutorials and share them with selected courses."
              : "Manage each source once and link it to all relevant courses."}
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="min-h-11 rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-[#17130a]"
        >
          Add {calculator ? "tutorial" : "source"}
        </button>
      </div>
      <input
        type="search"
        aria-label="Search DARB sources"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title, channel, model or course…"
        className="min-h-11 w-full rounded-xl border border-amber-100/20 bg-transparent px-4 py-3 text-sm"
      />
      {resources.isError || courses.isError ? (
        <div role="alert">
          Could not load sources.{" "}
          <button
            onClick={() => {
              void resources.refetch();
              void courses.refetch();
            }}
            className="underline"
          >
            Retry
          </button>
        </div>
      ) : resources.isPending || courses.isPending ? (
        <p role="status">Loading sources…</p>
      ) : !items.length ? (
        <p className="rounded-2xl border border-dashed border-amber-100/20 p-8 text-center text-amber-100/50">
          No sources found. Add a reviewed tutorial to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <article key={r.id} className="space-y-3 rounded-2xl border border-amber-100/15 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 dir="auto" className="break-words font-semibold">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-xs text-amber-100/50">
                    {r.channel} ·{" "}
                    {r.music_reviewed_at
                      ? r.music_status?.replaceAll("_", " ")
                      : "Audio review needed"}
                    {r.calculator_guide ? ` · Calculator · ${r.calculator_model}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleting(r)}
                    className="min-h-11 px-3 py-2 text-sm text-red-300"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setEditing(r)}
                    className="min-h-11 shrink-0 rounded-xl border border-amber-100/20 px-4 py-2 text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.course_links.map((l) => (
                  <span
                    key={l.course_slug}
                    className="rounded-lg bg-amber-100/5 px-2 py-1 text-xs text-amber-100/65"
                  >
                    {courses.data?.find((c) => c.slug === l.course_slug)?.name ?? l.course_slug} ·{" "}
                    {l.role === "primary" ? "Course source" : "Supporting"}
                  </span>
                ))}
                {!r.course_links.length && (
                  <span className="text-xs text-amber-100/40">
                    No course links · source retained
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
