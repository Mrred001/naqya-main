import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Report = {
  id: string;
  library: "general" | "fcds";
  details: string;
  page_path: string;
  status: "new" | "resolved";
  created_at: string;
};
export function ReportsAdmin() {
  const cache = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["site-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });
  async function change(report: Report) {
    setBusy(report.id);
    setFailure("");
    try {
      const { error } = await supabase
        .from("site_reports")
        .update({ status: report.status === "new" ? "resolved" : "new" })
        .eq("id", report.id);
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ["site-reports"] });
    } catch {
      setFailure("Could not update the report status.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section dir="ltr">
      <h2 className="mb-3 text-3xl font-bold text-amber-100">Reports</h2>
      <p className="mb-8 text-sm text-amber-100/50">The latest 200 reports from NAQYA and FCDS.</p>
      {failure ? <p role="alert">{failure}</p> : null}
      {isLoading ? (
        <p>Loading reports…</p>
      ) : error ? (
        <p role="alert">Could not load reports. Check the reports table and admin permissions.</p>
      ) : data.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-amber-200/15 bg-amber-100/[0.025] p-5"
            >
              <div className="flex flex-wrap justify-between gap-3 text-sm">
                <span>
                  {report.library === "fcds" ? "FCDS" : "NAQYA"} ·{" "}
                  {report.status === "new" ? "New" : "Resolved"}
                </span>
                <time dateTime={report.created_at}>
                  {new Date(report.created_at).toLocaleString("en")}
                </time>
              </div>
              <p className="my-4 whitespace-pre-wrap break-words">{report.details}</p>
              <p dir="ltr" className="break-all text-xs text-amber-100/50">
                {report.page_path}
              </p>
              <button
                disabled={busy !== null}
                onClick={() => change(report)}
                className="mt-4 rounded-lg border border-amber-200/25 px-4 py-2 text-sm text-amber-100 transition-colors hover:bg-amber-200/10 disabled:opacity-50"
              >
                {busy === report.id
                  ? "Saving…"
                  : report.status === "new"
                    ? "Mark resolved"
                    : "Reopen"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
