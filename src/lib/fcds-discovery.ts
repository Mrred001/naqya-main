import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FcdsResource = {
  id: string;
  course_slug: string;
  youtube_url: string;
  title: string;
  channel: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export const recentFcdsQuery = queryOptions({
  queryKey: ["fcds-discovery", "recent"],
  queryFn: async () => {
    const { data, error } = await supabase.from("fcds_playlists")
      .select("id,course_slug,youtube_url,title,channel,thumbnail_url,created_at")
      .order("created_at", { ascending: false }).order("id").limit(3);
    if (error) throw error;
    return (data ?? []) as FcdsResource[];
  },
  staleTime: 30_000,
});

export const popularFcdsQuery = queryOptions({
  queryKey: ["fcds-discovery", "popular"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_top_fcds_videos");
    if (error) throw error;
    return (data ?? []) as (FcdsResource & { total_opens: number })[];
  },
  staleTime: 30_000,
});

// Only intentional resource opens count, never a card render or dialog open.
// The database also suppresses repeat clicks from the same browser for 30 minutes.
export async function recordFcdsOpen(id: string): Promise<void> {
  try {
    const key = "darb-resource-visitor-v1";
    let visitor = localStorage.getItem(key);
    if (!visitor || !/^[0-9a-f-]{36}$/i.test(visitor)) {
      visitor = crypto.randomUUID();
      localStorage.setItem(key, visitor);
    }
    await supabase.rpc("record_fcds_open", { resource_id: id, visitor_id: visitor } as never);
  } catch {
    // Storage or telemetry failures must never prevent opening a resource.
  }
}
