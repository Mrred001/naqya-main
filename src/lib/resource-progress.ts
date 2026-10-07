import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgressStatus = "in_progress" | "completed";
export type ResourceProgress = { fcds_playlist_id: string; status: ProgressStatus };

export const resourceProgressQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["resource-progress", userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      if (!userId) return [] as ResourceProgress[];
      const { data, error } = await supabase
        .from("user_resource_progress")
        .select("fcds_playlist_id,status")
        .eq("user_id", userId)
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []) as ResourceProgress[];
    },
  });
