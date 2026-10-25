import { normalizeFcdsSpecialization } from "./fcds";
export const courseKinds = [
  { value: "core", ar: "مواد أساسية", en: "Core courses" },
  { value: "faculty", ar: "اختياري كلية", en: "Faculty elective" },
  { value: "program", ar: "اختياري برنامج", en: "Program elective" },
] as const;
export type CourseKind = (typeof courseKinds)[number]["value"];
type ClassifiedCourse = {
  course_kind?: string;
  specialization?: string;
  specializations?: string[];
  year: string;
  semester: number | null;
};
export function courseKind(course: Pick<ClassifiedCourse, "course_kind">): CourseKind {
  return course.course_kind === "faculty" || course.course_kind === "program"
    ? course.course_kind
    : "core";
}
export function courseKindLabel(course: Pick<ClassifiedCourse, "course_kind">, english = false) {
  const kind = courseKinds.find((k) => k.value === courseKind(course))!;
  return english ? kind.en : kind.ar;
}
export function matchesCourseFilters(
  course: ClassifiedCourse,
  filters: { kind: CourseKind; specialization: string; year?: string; semester?: number | null },
) {
  const kind = courseKind(course);
  if (kind !== filters.kind) return false;
  if (kind === "faculty") return true;
  const tracks = course.specializations?.length
    ? course.specializations
    : [normalizeFcdsSpecialization(course.specialization)];
  if (!tracks.includes(filters.specialization)) return false;
  return (
    kind !== "core" ||
    ((!filters.year || filters.year === "كل السنوات" || filters.year === course.year) &&
      (!filters.semester || filters.semester === course.semester))
  );
}
