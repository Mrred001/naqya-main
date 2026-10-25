import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  darbCoursesQuery,
  darbResourcesQuery,
  calculatorTopics,
  sourceKey,
  type DarbResource,
  type CourseAssociation,
} from "@/lib/darb-resources";
import { parseYouTube } from "@/lib/content";
import { validateMusicSelection, type MusicChoice } from "@/lib/music";
import { fetchYouTubeMeta } from "@/lib/youtube.functions";
import { MusicFields } from "./MusicFields";
import { CourseAssociations } from "./CourseAssociations";
const field =
  "w-full min-h-11 rounded-xl border border-amber-200/15 bg-[#19160f] px-4 py-3 text-sm text-amber-50 focus:ring-2 focus:ring-amber-300/40";
export type DarbSeed = Partial<DarbResource> & {
  communityRequestId?: string;
  suggestionId?: string;
  generalSuggestionId?: string;
};
export function DarbResourceEditor({
  initial = {},
  calculator = false,
  onDone,
}: {
  initial?: DarbSeed;
  calculator?: boolean;
  onDone: () => void;
}) {
  const courses = useQuery(darbCoursesQuery);
  const resources = useQuery(darbResourcesQuery);
  const qc = useQueryClient();
  const getMeta = useServerFn(fetchYouTubeMeta);
  const [url, setUrl] = useState(initial.youtube_url ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [channel, setChannel] = useState(initial.channel ?? "");
  const [language, setLanguage] = useState(initial.language ?? "Arabic");
  const [thumbnail, setThumbnail] = useState(initial.thumbnail_url ?? "");
  const [status, setStatus] = useState<MusicChoice>(
    initial.music_reviewed_at ? (initial.music_status ?? "") : "",
  );
  const [ranges, setRanges] = useState(initial.music_skip_ranges ?? "");
  const [guide, setGuide] = useState(initial.calculator_guide ?? calculator);
  const [topic, setTopic] = useState(initial.calculator_topic ?? "");
  const [model, setModel] = useState(initial.calculator_model ?? "");
  const [links, setLinks] = useState<CourseAssociation[]>(initial.course_links ?? []);
  const [busy, setBusy] = useState(false);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const parsed = parseYouTube(url);
  const duplicate = resources.data?.find(
    (r) => r.id !== initial.id && sourceKey(r.youtube_url) === sourceKey(url) && sourceKey(url),
  );
  async function metadata() {
    if (!parsed) return;
    setMetadataBusy(true);
    try {
      const result = await getMeta({ data: { id: parsed.id, kind: parsed.kind } });
      if (result.meta) {
        setTitle(result.meta.title ?? title);
        setChannel(result.meta.channel ?? channel);
        setThumbnail(result.meta.thumbnail_url ?? thumbnail);
      }
    } catch {
      toast.error("Could not fetch metadata. Enter the title manually.");
    } finally {
      setMetadataBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!parsed) {
      toast.error("Enter a valid YouTube video or playlist URL.");
      return;
    }
    if (initial.id && duplicate) {
      toast.error(
        "This URL belongs to another source. Edit that source to change its course links.",
      );
      return;
    }
    const error = validateMusicSelection(status, ranges, parsed.kind === "video");
    if (error) {
      toast.error(error);
      return;
    }
    if (!guide && !links.length && !initial.id) {
      toast.error("Select at least one course or the calculator guide.");
      return;
    }
    setBusy(true);
    try {
      const p_payload = {
        youtube_url: url,
        title,
        channel,
        language,
        thumbnail_url: thumbnail,
        music_status: status,
        music_skip_ranges: ranges,
        calculator_guide: guide,
        calculator_topic: guide ? topic : null,
        calculator_model: guide ? model : null,
      };
      const p_links = links.map((l) => ({
        course_slug: l.course_slug,
        role: l.role,
        note: l.note,
      }));
      const { error } = initial.communityRequestId
        ? await supabase.rpc("approve_calculator_request", {
            p_request: initial.communityRequestId,
            p_payload,
            p_links,
          })
        : await supabase.rpc("save_darb_resource", {
            ...(initial.id ? { p_id: initial.id } : {}),
            p_payload,
            p_links,
            ...(initial.suggestionId ? { p_suggestion: initial.suggestionId } : {}),
            ...(initial.generalSuggestionId
              ? { p_general_suggestion: initial.generalSuggestionId }
              : {}),
          });
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Source and course links saved");
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : ((error as { message?: string }).message ?? "Could not save source."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {initial.id
            ? "Edit source"
            : initial.suggestionId || initial.generalSuggestionId || initial.communityRequestId
              ? "Review & approve suggestion"
              : "Add source"}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onDone}
          className="min-h-10 px-3 text-sm text-amber-100/60"
        >
          Cancel
        </button>
      </div>
      <p className="text-sm text-amber-100/50">
        Edits apply everywhere this source appears. Unchecking a course removes its link and keeps
        the source, saves and progress.
      </p>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm">YouTube URL</span>
          <input
            required
            type="url"
            value={url}
            onChange={(e) => {
              if (sourceKey(url) !== sourceKey(e.target.value)) {
                setStatus("");
                setRanges("");
              }
              setUrl(e.target.value);
            }}
            disabled={metadataBusy}
            className={field}
          />
        </label>
        <button
          type="button"
          disabled={!parsed || metadataBusy}
          onClick={() => void metadata()}
          className="min-h-10 rounded-xl border border-amber-100/20 px-3 py-2 text-sm disabled:opacity-40"
        >
          {metadataBusy ? "Fetching…" : "Fetch title & thumbnail"}
        </button>
        {duplicate && (
          <div
            role="status"
            className="rounded-xl border border-amber-300/30 p-3 text-sm md:col-span-2"
          >
            This source already exists: <strong>{duplicate.title}</strong>.{" "}
            {initial.id
              ? "This URL belongs to a different source. Edit that source to update its course links."
              : "Saving reuses its ID and adds the selected course links. The reviewed metadata and music level will update everywhere."}
          </div>
        )}
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Channel</span>
          <input value={channel} onChange={(e) => setChannel(e.target.value)} className={field} />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field}>
            <option>Arabic</option>
            <option>English</option>
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm">Thumbnail URL (optional)</span>
          <input
            type="url"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            className={field}
          />
        </label>
        <MusicFields
          status={status}
          ranges={ranges}
          kind={parsed?.kind ?? "playlist"}
          onStatusChange={setStatus}
          onRangesChange={setRanges}
        />
        <label className="flex min-h-11 items-center gap-3 md:col-span-2">
          <input
            type="checkbox"
            checked={guide}
            onChange={(e) => setGuide(e.target.checked)}
            className="h-4 w-4 accent-amber-300"
          />
          Include in Calculator guide
        </label>
        {guide && (
          <>
            <label className="space-y-2">
              <span className="text-sm">Calculator operation</span>
              <select
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={field}
              >
                <option value="">Choose operation</option>
                {calculatorTopics.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.en} — {t.ar}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm">Calculator model</span>
              <input
                required
                maxLength={200}
                placeholder="e.g. Casio fx-991EX"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={field}
              />
            </label>
          </>
        )}
        {courses.isError ? (
          <p role="alert">
            Could not load courses.{" "}
            <button type="button" onClick={() => void courses.refetch()} className="underline">
              Retry
            </button>
          </p>
        ) : courses.isPending ? (
          <p role="status">Loading courses…</p>
        ) : (
          <CourseAssociations
            courses={courses.data}
            value={links}
            onChange={setLinks}
            defaultRole={guide ? "support" : "primary"}
          />
        )}
      </fieldset>
      <button
        type="submit"
        disabled={
          busy ||
          metadataBusy ||
          courses.isPending ||
          courses.isError ||
          Boolean(initial.id && duplicate)
        }
        className="min-h-11 rounded-xl bg-amber-300 px-6 py-3 font-semibold text-[#17130a] disabled:opacity-40"
      >
        {busy
          ? "Saving…"
          : initial.suggestionId || initial.generalSuggestionId || initial.communityRequestId
            ? "Save & approve"
            : "Save source"}
      </button>
    </form>
  );
}
