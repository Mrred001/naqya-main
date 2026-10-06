import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bookmark = {
  id: string;
  content_id: string | null;
  fcds_playlist_id: string | null;
  created_at: string;
};
export type BookmarkTarget = { kind: "general" | "fcds"; id: string };
export const bookmarkColumn = (kind: BookmarkTarget["kind"]) =>
  kind === "general" ? "content_id" : "fcds_playlist_id";
export const bookmarksQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["bookmarks", userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      if (!userId) return [] as Bookmark[];
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("id,content_id,fcds_playlist_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });
