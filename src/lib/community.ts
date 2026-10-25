import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DarbCourse, DarbResource } from "./darb-resources";
export type RequestKind =
  "message" | "calculator_suggestion" | "calculator_request" | "course_recommendation";
export function recommendationCourses(courses: DarbCourse[], resource: DarbResource) {
  return courses.filter((c) => !resource.course_links.some((l) => l.course_slug === c.slug));
}
export function communityVisitor() {
  const key = "darb-community-visitor-v1";
  try {
    const saved = localStorage.getItem(key);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved))
      return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
export async function submitCommunity(kind: RequestKind, payload: Json, courses: string[] = []) {
  const { data, error } = await supabase.rpc("submit_community_request", {
    p_kind: kind,
    p_payload: payload,
    p_courses: courses,
    p_visitor: communityVisitor(),
  });
  if (error) throw error;
  return data;
}
export const communityRequestsQuery = queryOptions({
  queryKey: ["community-requests"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("community_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});
