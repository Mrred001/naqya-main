import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { darbResourcesQuery, darbCoursesQuery } from "@/lib/darb-resources";
import { DarbResourceCard } from "@/components/fcds/DarbResourceCard";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
export const Route = createFileRoute("/fcds/resource/$id")({
  head: () => ({ meta: [{ title: "مصدر درب — فيديوهات وقوائم تشغيل" }] }),
  component: ResourcePage,
});
function ResourcePage() {
  const { id } = Route.useParams();
  const query = useQuery(darbResourcesQuery);
  const courses = useQuery(darbCoursesQuery);
  const { language } = useSitePreferences();
  const en = language === "en";
  const resource = query.data?.find((r) => r.id === id);
  return (
    <section className="mx-auto max-w-4xl space-y-6 px-5 py-12 md:px-8" dir={en ? "ltr" : "rtl"}>
      <Link to="/fcds" className="text-primary">
        {en ? "Back to DARB" : "العودة إلى درب"}
      </Link>
      {query.isPending ? (
        <p role="status">{en ? "Loading source…" : "جاري تحميل المصدر…"}</p>
      ) : query.isError ? (
        <p role="alert">{en ? "Could not load the source." : "ما قدرنا نحمّل المصدر."}</p>
      ) : !resource ? (
        <p>{en ? "Source not found." : "المصدر غير موجود."}</p>
      ) : (
        <>
          <h1 dir="auto" className="text-3xl font-bold">
            {resource.title}
          </h1>
          <DarbResourceCard resource={resource} />
          {resource.calculator_guide && (
            <Link to="/fcds/calculator" className="inline-block text-amber-700 dark:text-amber-300">
              {en ? "Calculator guide" : "دليل الآلة الحاسبة"}
            </Link>
          )}
          <div className="flex flex-wrap gap-2">
            {resource.course_links.map((link) => (
              <Link
                key={link.course_slug}
                to="/fcds/course/$slug"
                params={{ slug: link.course_slug }}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                {courses.data?.find((c) => c.slug === link.course_slug)?.name ?? link.course_slug}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
