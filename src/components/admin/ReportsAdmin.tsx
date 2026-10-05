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
      setFailure("تعذّر تحديث حالة البلاغ.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section dir="rtl">
      <h2 className="mb-3 text-3xl font-bold">البلاغات</h2>
      <p className="mb-8 text-sm text-white/50">آخر ٢٠٠ بلاغ من نقيا والكلية.</p>
      {failure ? <p role="alert">{failure}</p> : null}
      {isLoading ? (
        <p>جاري التحميل…</p>
      ) : error ? (
        <p role="alert">تعذّر تحميل البلاغات. تأكد من إعداد جدول البلاغات وصلاحيات الإدارة.</p>
      ) : data.length === 0 ? (
        <p>ما في بلاغات حالياً.</p>
      ) : (
        <div className="space-y-4">
          {data.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-wrap justify-between gap-3 text-sm">
                <span>
                  {report.library === "fcds" ? "الكلية" : "نقيا العام"} ·{" "}
                  {report.status === "new" ? "جديد" : "تم الحل"}
                </span>
                <time dateTime={report.created_at}>
                  {new Date(report.created_at).toLocaleString("ar")}
                </time>
              </div>
              <p className="my-4 whitespace-pre-wrap break-words">{report.details}</p>
              <p dir="ltr" className="break-all text-xs text-white/50">
                {report.page_path}
              </p>
              <button
                disabled={busy !== null}
                onClick={() => change(report)}
                className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy === report.id
                  ? "جاري الحفظ…"
                  : report.status === "new"
                    ? "تم الحل"
                    : "إعادة فتح"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
