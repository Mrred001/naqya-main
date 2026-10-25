import { supabase } from "@/integrations/supabase/client";
export type Section = "suggestions" | "community" | "reports";
type PendingWork = { id: string; title: string; section: Section; kind: string };
export const pendingWorkQuery = {
  queryKey: ["admin-review-work"],
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    const tables = [
      "fcds_playlist_suggestions",
      "general_content_suggestions",
      "community_requests",
      "site_reports",
    ] as const;
    const groups = await Promise.all(
      tables.map(async (table) => {
        const rows: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("status", table === "site_reports" ? "new" : "pending")
            .order("created_at")
            .range(offset, offset + 999)
            .abortSignal(signal);
          if (error) throw error;
          rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
          if (!data || data.length < 1000) break;
        }
        return rows
          .filter((r) => r["kind"] !== "message")
          .map(
            (r) =>
              ({
                id: `${table}:${r["id"]}`,
                title: String(r["title"] ?? r["details"] ?? "Request"),
                section:
                  table === "site_reports"
                    ? "reports"
                    : table === "community_requests"
                      ? "community"
                      : "suggestions",
                kind:
                  table === "site_reports"
                    ? "Report"
                    : table === "community_requests"
                      ? String(r["kind"])
                      : table.startsWith("fcds")
                        ? "Darb suggestion"
                        : "Naqya suggestion",
              }) as PendingWork,
          );
      }),
    );
    return groups.flat();
  },
  staleTime: 10_000,
  refetchInterval: 15_000,
};
