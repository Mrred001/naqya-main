import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMusicReview } from "@/components/admin/useMusicReview";

function Harness({ url, done }: { url: string; done: (review: unknown) => void }) {
  const { requestMusicReview, musicReviewDialog } = useMusicReview();
  return (
    <>
      <button onClick={async () => done(await requestMusicReview(url, "Suggested resource"))}>
        Add resource
      </button>
      {musicReviewDialog}
    </>
  );
}
const video = "https://youtu.be/abc123";
function open(url = video) {
  const done = vi.fn();
  render(<Harness url={url} done={done} />);
  fireEvent.click(screen.getByRole("button", { name: "Add resource" }));
  return done;
}
describe("suggestion music review", () => {
  it("uses a custom dialog with no default classification and cancels without approval", async () => {
    const done = open();
    expect(screen.getByRole("dialog", { name: "Review music level" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve & add" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(done).toHaveBeenCalledWith(null));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("returns the explicit no-music review before approval", async () => {
    const done = open();
    fireEvent.click(screen.getByRole("radio", { name: /^No Music/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve & add" }));
    await waitFor(() =>
      expect(done).toHaveBeenCalledWith({
        music_status: "no_music",
        music_skip_ranges: null,
        music_reviewed_at: expect.any(String),
      }),
    );
  });
  it("accepts a free-form music note for minimal-music videos", async () => {
    const done = open();
    fireEvent.click(screen.getByRole("radio", { name: /^Minimal Music/ }));
    fireEvent.change(screen.getByLabelText("Music notes (optional)"), {
      target: { value: "في موسيقى آخر 25 ثانية" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve & add" }));
    await waitFor(() =>
      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          music_status: "minimal_music",
          music_skip_ranges: "في موسيقى آخر 25 ثانية",
        }),
      ),
    );
  });
  it("allows a playlist-level minimal-music notice with empty notes", async () => {
    const done = open("https://youtube.com/playlist?list=PLtest");
    fireEvent.click(screen.getByRole("radio", { name: /^Minimal Music/ }));
    expect(screen.getByLabelText("Music notes (optional)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve & add" }));
    await waitFor(() =>
      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({ music_status: "minimal_music", music_skip_ranges: null }),
      ),
    );
  });
});
