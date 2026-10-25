import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { communityRequestsQuery } from "@/lib/community";
import { darbCoursesQuery, darbResourcesQuery } from "@/lib/darb-resources";
import { DarbResourceEditor, type DarbSeed } from "./DarbResourceEditor";
const labels: Record<string, string> = {
  message: "Message to Ahmed",
  calculator_suggestion: "Calculator suggestion",
  calculator_request: "Tutorial request",
  course_recommendation: "Course recommendation",
};
const field =
  "min-h-11 w-full rounded-xl border border-amber-200/20 bg-[#19160f] px-3 py-2 text-sm text-amber-50";
export function CommunityRequestsAdmin() {
  const requests = useQuery(communityRequestsQuery);
  const courses = useQuery(darbCoursesQuery);
  const resources = useQuery(darbResourcesQuery);
  const qc = useQueryClient();
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("pending");
  const [editing, setEditing] = useState<DarbSeed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, "primary" | "support">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const items = (requests.data ?? []).filter(
    (r) => (kind === "all" || r.kind === kind) && (status === "all" || r.status === status),
  );
  async function resolve(id: string, next: "resolved" | "rejected") {
    setBusy(id);
    try {
      const { error } = await supabase
        .from("community_requests")
        .update({ status: next })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Request updated");
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Could not update request");
    } finally {
      setBusy(null);
    }
  }
  async function approve(id: string) {
    setBusy(id);
    try {
      const { error } = await supabase.rpc("approve_course_recommendation", {
        p_request: id,
        p_role: roles[id] ?? "support",
        p_note: notes[id] ?? "",
      });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Source linked to course");
    } catch (error) {
      toast.error((error as { message?: string }).message ?? "Could not approve recommendation");
    } finally {
      setBusy(null);
    }
  }
  if (editing)
    return <DarbResourceEditor initial={editing} calculator onDone={() => setEditing(null)} />;
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold">Messages & requests</h2>
        <p className="mt-2 text-sm text-amber-100/50">
          Latest 200 messages, calculator requests and course recommendations. Times shown in Egypt
          time.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          aria-label="Request type"
          className={field}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">All types</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Request status"
          className={field}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All statuses</option>
        </select>
      </div>
      {requests.isPending ? (
        <p role="status">Loading requests…</p>
      ) : requests.isError || courses.isError || resources.isError ? (
        <p role="alert">
          Could not load requests.{" "}
          <button
            className="underline"
            onClick={() => {
              void requests.refetch();
              void courses.refetch();
              void resources.refetch();
            }}
          >
            Retry
          </button>
        </p>
      ) : !items.length ? (
        <p className="rounded-2xl border border-dashed border-amber-100/20 p-8 text-center text-amber-100/50">
          No requests in this view.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((r) => {
            const source = resources.data?.find((s) => s.id === r.resource_id);
            const course = courses.data?.find((c) => c.slug === r.course_slug);
            return (
              <article key={r.id} className="space-y-4 rounded-2xl border border-amber-100/15 p-5">
                <div className="flex flex-wrap justify-between gap-3 text-xs text-amber-100/50">
                  <span>
                    {labels[r.kind]} · {r.status}
                  </span>
                  <time dateTime={r.created_at}>
                    {new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}
                  </time>
                </div>
                {r.title && (
                  <h3 dir="auto" className="break-words text-xl font-semibold">
                    {r.title}
                  </h3>
                )}
                {source && (
                  <Link
                    to="/fcds/resource/$id"
                    params={{ id: source.id }}
                    className="block break-words font-semibold text-amber-200"
                  >
                    {source.title} ↗
                  </Link>
                )}
                {r.kind === "course_recommendation" && (
                  <p className="text-sm">
                    Course: {course?.name ?? "Course no longer available"}
                    {!source && " · Source no longer available"}
                  </p>
                )}
                {r.calculator_model && (
                  <p dir="auto" className="text-sm text-amber-100/65">
                    {r.calculator_model} · {r.calculator_topic}
                  </p>
                )}
                {r.details && (
                  <p
                    dir="auto"
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-100/75"
                  >
                    {r.details}
                  </p>
                )}
                {r.youtube_url && (
                  <a
                    href={r.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-amber-200 underline"
                  >
                    Review on YouTube ↗
                  </a>
                )}
                {r.status === "pending" && (
                  <div className="space-y-3">
                    {r.kind === "course_recommendation" && source && course && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-xs text-amber-100/60">
                          Role in this course
                          <select
                            aria-label={`Role for recommendation ${r.id}`}
                            className={field}
                            value={roles[r.id] ?? "support"}
                            onChange={(e) =>
                              setRoles({
                                ...roles,
                                [r.id]: e.target.value as "primary" | "support",
                              })
                            }
                          >
                            <option value="support">Supporting explanation</option>
                            <option value="primary">Course source</option>
                          </select>
                        </label>
                        <label className="space-y-1 text-xs text-amber-100/60">
                          Public course note (optional)
                          <textarea
                            maxLength={1500}
                            className={field}
                            value={notes[r.id] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                          />
                        </label>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {r.kind === "course_recommendation" && (
                        <button
                          disabled={busy !== null || !source || !course}
                          onClick={() => void approve(r.id)}
                          className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-[#17130a] disabled:opacity-40"
                        >
                          Approve link
                        </button>
                      )}
                      {r.kind.startsWith("calculator_") && (
                        <button
                          disabled={busy !== null}
                          onClick={() =>
                            setEditing({
                              communityRequestId: r.id,
                              title: r.title,
                              ...(r.youtube_url ? { youtube_url: r.youtube_url } : {}),
                              calculator_guide: true,
                              calculator_topic: r.calculator_topic,
                              calculator_model: r.calculator_model,
                            })
                          }
                          className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-[#17130a]"
                        >
                          {r.kind === "calculator_suggestion"
                            ? "Review & publish"
                            : "Add reviewed tutorial"}
                        </button>
                      )}
                      {r.kind === "message" && (
                        <button
                          disabled={busy !== null}
                          onClick={() => void resolve(r.id, "resolved")}
                          className="min-h-11 rounded-xl border border-amber-100/20 px-4 py-2 text-sm"
                        >
                          Mark resolved
                        </button>
                      )}
                      <button
                        disabled={busy !== null}
                        onClick={() => void resolve(r.id, "rejected")}
                        className="min-h-11 rounded-xl px-4 py-2 text-sm text-red-300 disabled:opacity-40"
                      >
                        {r.kind === "message" ? "Dismiss" : "Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
