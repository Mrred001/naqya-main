import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MusicNotice } from "@/components/site/MusicNotice";
import { MusicFields } from "@/components/admin/MusicFields";
vi.mock("@/components/site/PreferencesProvider", () => ({
  useSitePreferences: () => ({ language: "en" }),
}));
describe("music review notices", () => {
  it("shows an unreviewed notice for historic resources", () => {
    render(<MusicNotice status={null} />);
    expect(screen.getByText("Audio not reviewed")).toBeInTheDocument();
    expect(screen.queryByText("No Music")).not.toBeInTheDocument();
  });
  it("shows a skip recommendation and confirmed timings", () => {
    render(<MusicNotice status="minimal_music" skipRanges="00:00-00:18" />);
    expect(screen.getByText(/Please skip the parts/)).toBeInTheDocument();
    expect(screen.getByText("00:00 – 00:18")).toBeInTheDocument();
  });
  it("does not warn after an explicit no-music review", () => {
    const { container } = render(<MusicNotice status="no_music" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("starts new resources without assuming a no-music classification", () => {
    render(
      <MusicFields
        status=""
        ranges=""
        kind="video"
        onStatusChange={vi.fn()}
        onRangesChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByRole("combobox")).toBeRequired();
  });
});
