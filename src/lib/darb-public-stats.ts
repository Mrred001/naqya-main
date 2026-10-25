import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export type PublicDarbStats = {
  playlists: number;
  videos: number;
  visits: number;
  tracked_since: string | null;
};
export const darbStatsQuery = queryOptions({
  queryKey: ["darb-public-stats"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_darb_public_stats");
    if (error) throw error;
    return data as unknown as PublicDarbStats;
  },
});
