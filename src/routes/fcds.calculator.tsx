import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator } from "lucide-react";
import { darbResourcesQuery, calculatorTopics } from "@/lib/darb-resources";
import { DarbResourceCard } from "@/components/fcds/DarbResourceCard";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { useSearchAnalytics } from "@/lib/use-search-analytics";
export const Route = createFileRoute("/fcds/calculator")({
  head: () => ({
    meta: [
      { title: "دليل الآلة الحاسبة — درب" },
      { name: "description", content: "شروحات استخدام الآلة الحاسبة حسب العملية والموديل." },
    ],
  }),
  component: CalculatorGuide,
});
function CalculatorGuide() {
  const { language } = useSitePreferences();
  const en = language === "en";
  const query = useQuery(darbResourcesQuery);
  const [topic, setTopic] = useState("all");
  const [model, setModel] = useState("all");
  const [search, setSearch] = useState("");
  const resources = (query.data ?? []).filter((r) => r.calculator_guide);
  const models = [
    ...new Set(resources.flatMap((r) => (r.calculator_model ? [r.calculator_model] : []))),
  ].sort();
  const filtered = resources.filter(
    (r) =>
      (topic === "all" || r.calculator_topic === topic) &&
      (model === "all" || r.calculator_model === model) &&
      `${r.title} ${r.channel ?? ""} ${r.calculator_model ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useSearchAnalytics("fcds", search, filtered.length, query.isSuccess);
  return (
    <section className="mx-auto max-w-5xl space-y-6 px-5 py-12 md:px-8" dir={en ? "ltr" : "rtl"}>
      <Link to="/fcds" className="text-sm text-primary">
        {en ? "Back to DARB" : "العودة إلى درب"}
      </Link>
      <div>
        <span className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <Calculator className="h-5 w-5" />
          {en ? "For every year" : "دليل مساعد لكل السنوات"}
        </span>
        <h1 className="mt-3 text-4xl font-bold">
          {en ? "Calculator guide" : "دليل الآلة الحاسبة"}
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {en
            ? "Find the operation you need, and check the calculator model before following the steps."
            : "اختار العملية البتحتاجها، واتأكد من موديل الآلة قبل تطبيق الخطوات."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="search"
          aria-label={en ? "Search calculator tutorials" : "بحث في شروحات الآلة"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={en ? "Search tutorials…" : "ابحث عن شرح…"}
          className="min-h-11 rounded-xl border bg-card px-4 py-3"
        />
        {models.length > 1 && (
          <select
            aria-label={en ? "Calculator model" : "موديل الآلة"}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="min-h-11 rounded-xl border bg-card px-4 py-3"
          >
            <option value="all">{en ? "All models" : "كل الموديلات"}</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
      </div>
      <div
        role="group"
        aria-label={en ? "Operation" : "نوع العملية"}
        className="flex flex-wrap gap-2"
      >
        {[{ value: "all", ar: "الكل", en: "All" }, ...calculatorTopics].map((t) => (
          <button
            type="button"
            key={t.value}
            aria-pressed={topic === t.value}
            onClick={() => setTopic(t.value)}
            className={`min-h-10 rounded-full border px-4 py-2 text-sm ${topic === t.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
          >
            {en ? t.en : t.ar}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <p role="status">{en ? "Loading tutorials…" : "جاري تحميل الشروحات…"}</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{en ? "Could not load tutorials." : "ما قدرنا نحمّل الشروحات."}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 text-primary underline"
          >
            {en ? "Try again" : "حاول تاني"}
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {resources.length
            ? en
              ? "No matching tutorials."
              : "ما لقينا شرح مطابق للبحث."
            : en
              ? "Calculator tutorials will appear here after curator review."
              : "شروحات الآلة حتظهر هنا بعد إضافتها ومراجعتها."}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((resource) => (
            <DarbResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </section>
  );
}
