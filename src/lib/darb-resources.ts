import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseYouTube, type MusicStatus } from "./content";

export type CourseAssociation = {
  resource_id?: string;
  course_slug: string;
  role: "primary" | "support";
  note: string | null;
};
export type DarbCourse = {
  id: string;
  slug: string;
  name: string;
  code: string;
  year: string;
  semester: number | null;
  specialization?: string;
  created_at: string;
};
export type DarbResource = {
  id: string;
  course_slug: string | null;
  youtube_url: string;
  title: string;
  channel: string | null;
  language: string;
  thumbnail_url: string | null;
  created_at: string;
  music_status: MusicStatus | null;
  music_skip_ranges: string | null;
  music_reviewed_at: string | null;
  calculator_guide: boolean;
  calculator_topic: string | null;
  calculator_model: string | null;
  course_links: CourseAssociation[];
};
export const calculatorTopics = [
  { value: "basics", ar: "الأساسيات", en: "Basics" },
  { value: "matrices", ar: "المصفوفات", en: "Matrices" },
  { value: "equations", ar: "المعادلات", en: "Equations" },
  { value: "statistics", ar: "الإحصاء", en: "Statistics" },
  { value: "other", ar: "عمليات أخرى", en: "Other operations" },
] as const;
export const darbResourcesQuery = queryOptions({
  queryKey: ["darb-resources"],
  staleTime: 30_000,
  queryFn: async () => {
    const rows: DarbResource[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("fcds_playlists")
        .select("*,course_links:fcds_resource_courses(*)")
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      rows.push(...((data ?? []) as unknown as DarbResource[]));
      if ((data?.length ?? 0) < 1000) break;
    }
    return rows;
  },
});
export const darbCoursesQuery = queryOptions({
  queryKey: ["fcds-courses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("fcds_courses")
      .select("*")
      .order("semester", { ascending: true, nullsFirst: false })
      .order("name");
    if (error) throw error;
    return (data ?? []) as DarbCourse[];
  },
});
export function sourceKey(url: string): string | null {
  const parsed = parseYouTube(url);
  return parsed ? `${parsed.kind}:${parsed.id}` : null;
}
export function resourcesForCourse(
  resources: DarbResource[],
  slug: string,
  role?: CourseAssociation["role"],
) {
  return resources.filter((r) =>
    r.course_links.some((link) => link.course_slug === slug && (!role || role === link.role)),
  );
}
export function resourceCoverage(resources: DarbResource[], courses: DarbCourse[]) {
  const associations = resources.reduce((sum, r) => sum + r.course_links.length, 0);
  const covered = courses.filter(
    (c) => resourcesForCourse(resources, c.slug, "primary").length > 0,
  ).length;
  const supportOnly = courses.filter(
    (c) =>
      !resourcesForCourse(resources, c.slug, "primary").length &&
      resourcesForCourse(resources, c.slug, "support").length > 0,
  ).length;
  return { unique: resources.length, associations, covered, supportOnly, total: courses.length };
}
