import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { reviewReasons } from "@/lib/review-queue";
const state = vi.hoisted(() => ({ reviewed: false, fail: false, update: vi.fn() }));
vi.mock("@/lib/darb-resources", () => ({
  darbResourcesQuery: {
    queryKey: ["darb-resources"],
    queryFn: async () => [
      {
        id: "one",
        title: "Pending tutorial",
        youtube_url: "https://youtu.be/abcdefghijk",
        channel: "Tutor",
        music_status: state.reviewed ? "no_music" : null,
        music_reviewed_at: state.reviewed ? "2026-10-25" : null,
      },
    ],
  },
}));
vi.mock("@/lib/content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/content")>()),
  contentQuery: { queryKey: ["content"], queryFn: async () => [] },
}));
vi.mock("@/lib/pending-work", () => ({
  pendingWorkQuery: {
    queryKey: ["admin-review-work"],
    queryFn: async () => [
      {
        id: "request",
        title: "Student recommendation",
        section: "community",
        kind: "course_recommendation",
      },
    ],
  },
}));
vi.mock("@/components/admin/DarbResourceEditor", () => ({
  DarbResourceEditor: () => <p>Edit source</p>,
}));
vi.mock("@/components/admin/MusicReviewDialog", () => ({
  MusicReviewDialog: ({
    onComplete,
    failure,
  }: {
    onComplete: (r: unknown) => void;
    failure?: string;
  }) => (
    <div>
      {failure && <p role="alert">{failure}</p>}
      <button
        onClick={() =>
          onComplete({
            music_status: "no_music",
            music_reviewed_at: "2026-10-25",
            music_skip_ranges: null,
          })
        }
      >
        Save review
      </button>
      <button onClick={() => onComplete(null)}>Cancel review</button>
    </div>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        state.update(payload);
        return {
          eq: () => ({
            select: () => ({
              single: async () => {
                if (state.fail) return { error: { message: "Save failed" } };
                state.reviewed = true;
                return { data: { id: "one" }, error: null };
              },
            }),
          }),
        };
      },
    }),
  },
}));
beforeEach(() => {
  state.reviewed = false;
  state.fail = false;
  state.update.mockClear();
});
afterEach(cleanup);
function mount() {
  const onOpen = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <ReviewQueue onOpen={onOpen} onEditGeneral={vi.fn()} />
    </QueryClientProvider>,
  );
  return onOpen;
}
it("removes a source from Pending only after saving an explicit review", async () => {
  const onOpen = mount();
  await screen.findByText("Pending tutorial");
  fireEvent.click(screen.getByRole("button", { name: "Review audio" }));
  expect(state.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save review" }));
  await waitFor(() => expect(screen.queryByText("Pending tutorial")).not.toBeInTheDocument());
  expect(state.update).toHaveBeenCalledWith(
    expect.objectContaining({ music_status: "no_music", music_reviewed_at: "2026-10-25" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open for review" }));
  expect(onOpen).toHaveBeenCalledWith("community");
});
it("keeps failed reviews pending and allows retry", async () => {
  state.fail = true;
  mount();
  await screen.findByText("Pending tutorial");
  fireEvent.click(screen.getByRole("button", { name: "Review audio" }));
  fireEvent.click(screen.getByRole("button", { name: "Save review" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Pending tutorial")).toBeVisible();
  state.fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Save review" }));
  await waitFor(() => expect(screen.queryByText("Pending tutorial")).not.toBeInTheDocument());
});
it("cancel never classifies a source", async () => {
  mount();
  await screen.findByText("Pending tutorial");
  fireEvent.click(screen.getByRole("button", { name: "Review audio" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel review" }));
  expect(state.update).not.toHaveBeenCalled();
  expect(screen.getByText("Pending tutorial")).toBeVisible();
});
it("finds legacy classifications, missing metadata and invalid video timings", () => {
  const r = {
    title: "Video",
    channel: "Tutor",
    youtube_url: "https://youtu.be/abcdefghijk",
    music_status: "no_music",
    music_reviewed_at: null,
  };
  expect(reviewReasons(r)).toContain("Audio review");
  expect(reviewReasons({ ...r, music_status: "has_music", music_reviewed_at: "date" })).toContain(
    "Audio review",
  );
  expect(reviewReasons({ ...r, channel: null })).toContain("Source details");
  expect(
    reviewReasons({ ...r, music_status: "minimal_music", music_reviewed_at: "date" }),
  ).toContain("Music timestamps");
  expect(
    reviewReasons({
      ...r,
      music_status: "minimal_music",
      music_reviewed_at: "date",
      music_skip_ranges: "00:00-00:10",
    }),
  ).toEqual([]);
  expect(reviewReasons({ ...r, music_status: "no_music", music_reviewed_at: "date" })).toEqual([]);
});
