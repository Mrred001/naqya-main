import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import {
  resourcesForCourse,
  resourceCoverage,
  sourceKey,
  type DarbResource,
  type DarbCourse,
  type CourseAssociation,
} from "@/lib/darb-resources";
import { CourseAssociations } from "@/components/admin/CourseAssociations";
const courses: DarbCourse[] = [
  { id: "a", slug: "a", name: "Matrices", code: "M1", year: "Year 1", semester: 1, created_at: "" },
  { id: "b", slug: "b", name: "Systems", code: "S2", year: "Year 2", semester: 3, created_at: "" },
  {
    id: "c",
    slug: "c",
    name: "Numerical",
    code: "N3",
    year: "Year 2",
    semester: 3,
    created_at: "",
  },
];
const resource: DarbResource = {
  id: "source",
  course_slug: "a",
  title: "Matrix operations",
  youtube_url: "https://youtu.be/abcdefghijk",
  channel: null,
  language: "Arabic",
  thumbnail_url: null,
  created_at: "",
  music_status: "no_music",
  music_skip_ranges: null,
  music_reviewed_at: "reviewed",
  calculator_guide: true,
  calculator_topic: "matrices",
  calculator_model: "fx-991EX",
  course_links: [
    { course_slug: "a", role: "primary", note: null },
    { course_slug: "b", role: "support", note: "For matrices only" },
  ],
};
afterEach(cleanup);
describe("shared DARB sources", () => {
  it("reuses one canonical source across roles without increasing unique count", () => {
    expect(resourcesForCourse([resource], "a", "primary")[0]?.id).toBe("source");
    expect(resourcesForCourse([resource], "b", "support")[0]?.id).toBe("source");
    expect(resourceCoverage([resource], courses)).toEqual({
      unique: 1,
      associations: 2,
      covered: 1,
      supportOnly: 1,
      total: 3,
    });
  });
  it("does not count calculator or supporting-only sources as curriculum coverage", () => {
    const guide = {
      ...resource,
      course_links: [{ course_slug: "a", role: "support" as const, note: null }],
    };
    expect(resourceCoverage([guide], courses).covered).toBe(0);
    expect(resourcesForCourse([guide], "a", "primary")).toHaveLength(0);
  });
  it("unlinks a course while retaining the source ID and other courses", () => {
    const updated = {
      ...resource,
      course_links: resource.course_links.filter((l) => l.course_slug !== "a"),
    };
    expect(updated.id).toBe(resource.id);
    expect(resourcesForCourse([updated], "a")).toHaveLength(0);
    expect(resourcesForCourse([updated], "b")).toHaveLength(1);
  });
  it("identifies equivalent YouTube URLs and rejects unrelated URLs", () => {
    expect(sourceKey(resource.youtube_url)).toBe(
      sourceKey("https://www.youtube.com/watch?v=abcdefghijk&t=30"),
    );
    expect(sourceKey("https://example.com/watch?v=abcdefghijk")).toBeNull();
  });
});
function Harness() {
  const [links, setLinks] = useState<CourseAssociation[]>(resource.course_links);
  return (
    <CourseAssociations courses={courses} value={links} onChange={setLinks} defaultRole="support" />
  );
}
describe("course checklist", () => {
  it("selects all current courses even when search is filtered, preserving existing roles and notes", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Numerical" } });
    fireEvent.click(screen.getByRole("button", { name: "Select all current courses" }));
    expect(screen.getByText("Linked courses · 3 selected")).toBeInTheDocument();
    expect(screen.getByLabelText("Role for Numerical")).toHaveValue("support");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    expect(screen.getByLabelText("Role for Matrices")).toHaveValue("primary");
    expect(screen.getByLabelText("Note for Systems")).toHaveValue("For matrices only");
  });
  it("allows independent role and note changes and clears course links", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Role for Matrices"), { target: { value: "support" } });
    expect(screen.getByLabelText("Role for Matrices")).toHaveValue("support");
    fireEvent.change(screen.getByLabelText("Note for Matrices"), {
      target: { value: "Calculator steps" },
    });
    expect(screen.getByLabelText("Note for Matrices")).toHaveValue("Calculator steps");
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText("Linked courses · 0 selected")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").every((c) => !(c as HTMLInputElement).checked)).toBe(
      true,
    );
  });
});
