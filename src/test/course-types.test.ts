import { describe, expect, it } from "vitest";
import { courseKind, matchesCourseFilters } from "@/lib/course-types";
const base = { year: "السنة الأولى", semester: 1, specialization: "computer-data-science" };
describe("course classification filters", () => {
  it("keeps legacy courses core and excludes electives by default", () => {
    expect(courseKind({})).toBe("core");
    expect(
      matchesCourseFilters(base, {
        kind: "core",
        specialization: "computer-data-science",
        year: base.year,
        semester: 1,
      }),
    ).toBe(true);
    expect(
      matchesCourseFilters(
        { ...base, course_kind: "faculty" },
        { kind: "core", specialization: "computer-data-science" },
      ),
    ).toBe(false);
  });
  it("shares faculty electives across tracks without temporal filtering", () => {
    expect(
      matchesCourseFilters(
        { ...base, course_kind: "faculty", year: "", semester: null },
        { kind: "faculty", specialization: "ai", year: "السنة الرابعة", semester: 8 },
      ),
    ).toBe(true);
  });
  it("scopes program electives to every linked track and ignores year", () => {
    const course = {
      ...base,
      course_kind: "program",
      year: "",
      semester: null,
      specializations: ["computer-data-science", "ai"],
    };
    expect(
      matchesCourseFilters(course, { kind: "program", specialization: "ai", semester: 7 }),
    ).toBe(true);
    expect(matchesCourseFilters(course, { kind: "program", specialization: "healthcare" })).toBe(
      false,
    );
  });
  it("continues filtering core courses by semester and year", () => {
    expect(
      matchesCourseFilters(base, {
        kind: "core",
        specialization: "computer-data-science",
        semester: 2,
      }),
    ).toBe(false);
    expect(
      matchesCourseFilters(base, {
        kind: "core",
        specialization: "computer-data-science",
        year: "السنة الثانية",
      }),
    ).toBe(false);
  });
});
