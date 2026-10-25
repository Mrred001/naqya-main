import { courseKind, courseKindLabel } from "@/lib/course-types";
import { CommunityRequestButton } from "@/components/fcds/CommunityRequestButton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { darbCoursesQuery, darbResourcesQuery, resourcesForCourse } from "@/lib/darb-resources";
import { DarbResourceCard } from "@/components/fcds/DarbResourceCard";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { AccountMenu } from "@/components/account/AccountMenu";
import { SavedItemsLink } from "@/components/account/SavedItemsLink";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { LanguageToggle } from "@/components/site/LanguageToggle";
export const Route = createFileRoute("/fcds/course/$slug")({
  head: () => ({ meta: [{ title: "درب FCDS — مصادر مادتك" }] }),
  component: CoursePage,
});
function CoursePage() {
  const { slug } = Route.useParams();
  const { language } = useSitePreferences();
  const en = language === "en";
  const courses = useQuery(darbCoursesQuery);
  const resources = useQuery(darbResourcesQuery);
  const course = courses.data?.find((c) => c.slug === slug);
  if (courses.isPending || resources.isPending)
    return (
      <p role="status" className="p-10 text-center">
        {en ? "Loading…" : "جاري التحميل…"}
      </p>
    );
  if (courses.isError || resources.isError)
    return (
      <div role="alert" className="p-10 text-center">
        <p>{en ? "Could not load course sources." : "ما قدرنا نحمّل مصادر المادة."}</p>
        <button
          onClick={() => {
            void courses.refetch();
            void resources.refetch();
          }}
          className="mt-3 text-primary underline"
        >
          {en ? "Try again" : "حاول تاني"}
        </button>
      </div>
    );
  if (!course)
    return (
      <div className="p-10 text-center">
        <p>{en ? "Course not found" : "المادة غير موجودة"}</p>
        <Link to="/fcds" className="text-primary">
          {en ? "Back to DARB" : "العودة إلى درب"}
        </Link>
      </div>
    );
  const primary = resourcesForCourse(resources.data, slug, "primary");
  const support = resourcesForCourse(resources.data, slug, "support");
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 md:px-8" dir={en ? "ltr" : "rtl"}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/fcds" className="font-bold text-primary">
          {en ? "Back to DARB" : "العودة إلى درب"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SavedItemsLink />
          <CommunityRequestButton kind="message" iconOnly />
          <AccountMenu />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <header>
        <p className="text-sm text-muted-foreground">
          {course.code} ·{" "}
          {courseKind(course) === "core" ? course.year : courseKindLabel(course, en)}
        </p>
        <h1 dir="auto" className="mt-3 text-3xl font-bold sm:text-4xl">
          {course.name}
        </h1>
      </header>
      {[
        { role: "primary", title: en ? "Course sources" : "مصادر المادة", items: primary },
        {
          role: "support",
          title: en ? "Supporting explanations" : "شروحات مساعدة",
          items: support,
        },
      ].map((section) =>
        section.role === "support" && !section.items.length ? null : (
          <section key={section.role} className="space-y-4">
            <h2 className="text-xl font-semibold">
              {section.title}
              <span className="mx-2 text-sm text-muted-foreground">({section.items.length})</span>
            </h2>
            {section.role === "support" && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {en
                  ? "Selected explanations that support this course; they may be shared with other courses."
                  : "شروحات مختارة بتساعدك في المادة، وممكن تكون مشتركة مع مواد تانية."}
              </p>
            )}
            {!section.items.length ? (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                {en
                  ? "No curriculum sources have been added yet."
                  : "لسه ما انضافت مصادر المنهج للمادة."}
              </p>
            ) : (
              section.items.map((resource) => (
                <DarbResourceCard
                  key={resource.id}
                  resource={resource}
                  courseSlug={slug}
                  note={resource.course_links.find((l) => l.course_slug === slug)?.note ?? null}
                />
              ))
            )}
          </section>
        ),
      )}
    </main>
  );
}
