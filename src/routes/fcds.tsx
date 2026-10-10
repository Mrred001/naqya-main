import { FcdsDiscovery } from "@/components/fcds/FcdsDiscovery";
import { checkSuggestionLink, duplicateSuggestionMessage } from "@/lib/suggestion-links";
import { SavedItemsLink } from "@/components/account/SavedItemsLink";
import { AccountMenu } from "@/components/account/AccountMenu";
import { AdminLink } from "@/components/account/AdminLink";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Search, Plus, BookOpen, X, Send, Loader2, Home, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { parseYouTube } from "@/lib/content";
import { defaultFcdsSpecialization, fcdsSpecializations, normalizeFcdsSpecialization, type FcdsSpecialization, fcdsYearForSemester, fcdsYearOptions } from "@/lib/fcds";
import { fetchYouTubeMeta } from "@/lib/youtube.functions";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/fcds")({
  head: () => ({
    meta: [
      { title: "درب FCDS — مصادر مادتك" },
      {
        name: "description",
        content: "مكتبة Playlists وفيديوهات مفيدة لطلاب FCDS.",
      },
    ],
  }),
  component: FCDS,
});

type FcdsCourse = {
  id: string;
  name: string;
  slug: string;
  code: string;
  year: string;
  semester: number | null;
  specialization?: FcdsSpecialization;
  created_at: string;
};

function FCDS() {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
  const [coursesVisible, setCoursesVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<FcdsSpecialization>(defaultFcdsSpecialization);
  const [selectedYear, setSelectedYear] = useState("كل السنوات");
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestKind, setSuggestKind] = useState<"playlist" | "video">("playlist");
  const [suggestCourse, setSuggestCourse] = useState("");
  const [suggestUrl, setSuggestUrl] = useState("");
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestChannel, setSuggestChannel] = useState("");
  const [suggestNote, setSuggestNote] = useState("");

  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const lastFetched = useRef("");

  const getMeta = useServerFn(fetchYouTubeMeta);

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError,
  } = useQuery({
    queryKey: ["fcds-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fcds_courses")
        .select("*")
        .order("semester", { ascending: true, nullsFirst: false })
        .order("year", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as FcdsCourse[];
    },
  });

  const filteredCourses = courses.filter((course) => {
    const q = search.toLowerCase().trim();

    const matchesSearch =
      course.name.toLowerCase().includes(q) || course.code.toLowerCase().includes(q);

    const matchesYear = selectedYear === "كل السنوات" || course.year === selectedYear;
    const matchesSemester = selectedSemester === null || course.semester === selectedSemester;

    const matchesSpecialization = normalizeFcdsSpecialization(course.specialization) === selectedSpecialization;
    return matchesSearch && matchesYear && matchesSemester && matchesSpecialization;
  });

  const resetSuggestionForm = () => {
    setSuggestKind("playlist");
    setSuggestCourse("");
    setSuggestUrl("");
    setSuggestTitle("");
    setSuggestChannel("");
    setSuggestNote("");
    setFetching(false);
    setSubmitting(false);
    setSubmitted(false);
    lastFetched.current = "";
  };

  const closeSuggest = () => {
    setSuggestOpen(false);
    resetSuggestionForm();
  };

  const openSuggest = () => {
    resetSuggestionForm();
    setSuggestOpen(true);
  };

  const onSuggestUrl = async (url: string) => {
    setSuggestUrl(url);

    const parsed = parseYouTube(url);

    if (!parsed) {
      lastFetched.current = "";
      setFetching(false);
      return;
    }

    setSuggestKind(parsed.kind);
    const requestKey = `${parsed.kind}:${parsed.id}`;
    if (lastFetched.current === requestKey) {
      return;
    }

    lastFetched.current = requestKey;

    setFetching(true);

    try {
      const res = await getMeta({
        data: {
          id: parsed.id,
          kind: parsed.kind,
        },
      });

      if (lastFetched.current !== requestKey) return;

      if (!res.meta) {
        toast.error(res.error ?? t("ما قدرنا نجيب بيانات المحتوى.", "Could not fetch video details."));

        lastFetched.current = "";
        return;
      }

      const meta = res.meta;

      setSuggestTitle(meta.title || "");
      setSuggestChannel(meta.channel || "");

      toast.success(t("تم جلب بيانات المحتوى تلقائياً", "Video details loaded automatically."));
    } catch (error) {
      if (lastFetched.current !== requestKey) return;
      console.error(error);

      toast.error(t("حصلت مشكلة أثناء جلب بيانات YouTube.", "There was a problem fetching YouTube details."));

      lastFetched.current = "";
    } finally {
      if (lastFetched.current === requestKey || lastFetched.current === "") setFetching(false);
    }
  };

  const submitSuggestion = async (e: FormEvent) => {
    e.preventDefault();

    if (!suggestCourse) {
      toast.error(t("اختار المادة.", "Choose a course."));
      return;
    }

    const parsed = parseYouTube(suggestUrl);

    if (!parsed) {
      toast.error(t("الرابط ما ظاهر كرابط YouTube صحيح.", "Enter a valid YouTube link."));
      return;
    }

    if (!suggestTitle.trim()) {
      toast.error(suggestKind === "video" ? t("اسم الفيديو مطلوب.", "Video title is required.") : t("اسم الـPlaylist مطلوب.", "Playlist title is required."));
      return;
    }

    setSubmitting(true);

    try {
      const duplicate = await checkSuggestionLink(suggestUrl);
      if (duplicate) {
        toast.error(duplicateSuggestionMessage(duplicate, english));
        setSubmitting(false);
        return;
      }
    } catch {
      toast.error(t("ما قدرنا نتحقق من الرابط. جرّب تاني.", "Could not check this link. Please try again."));
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("fcds_playlist_suggestions").insert({
      course_slug: suggestCourse,
      youtube_url: suggestUrl.trim(),
      title: suggestTitle.trim(),
      channel: suggestChannel.trim() || null,
      note: suggestNote.trim() || null,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      const duplicate = error.message?.includes("resource_already_exists") ? "existing"
        : error.message?.includes("resource_already_suggested") ? "pending" : null;
      if (duplicate) {
        toast.error(duplicateSuggestionMessage(duplicate, english));
        return;
      }

      console.error(error);
      toast.error(t("حصلت مشكلة أثناء إرسال الاقتراح.", "There was a problem submitting your suggestion."));
      return;
    }

    setSubmitted(true);
    toast.success(t("تم إرسال الاقتراح", "Suggestion submitted."));
  };

  if (pathname !== "/fcds") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen darb-page fcds-theme bg-background text-foreground">
      <header className="border-b border-border" dir="ltr">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center md:px-8">
          <div className="justify-self-center lg:col-start-3 lg:row-start-1 lg:justify-self-end" dir="rtl">
            {/* FCDS Logo - Right */}
            <Link
              to="/"
              className="group flex items-center gap-3"
              aria-label={t("العودة لاختيار المكتبة", "Back to library selection")}
            >
              <img
                src="/naqya-fcds-logo.png"
                alt="Darb FCDS"
                className="h-12 w-12 sm:h-16 sm:w-16 object-contain transition-transform duration-200 group-hover:scale-105"
              />

              <div className="flex items-baseline gap-2 whitespace-nowrap leading-none" dir="ltr">
                <p className="text-base font-bold tracking-[0.12em] transition-colors group-hover:text-primary">
                  DARB
                </p>

                <p className="font-mono text-xs tracking-[0.18em] text-primary">FCDS</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 justify-self-center lg:col-start-2 lg:row-start-1 sm:gap-2" dir="ltr">
            <AccountMenu iconOnly />
            <SavedItemsLink />
            <ThemeToggle />
            <LanguageToggle iconOnly />
            <AdminLink iconOnly />
            {/* Home - Left */}
            <Link
              to="/"
              aria-label={t("الرئيسية", "Home")}
              title={t("الرئيسية", "Home")}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-primary"
            >
              <Home className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <section className="hero-surface darb-hero mb-8 mt-6 rounded-3xl border px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
          <h1 className="max-w-3xl text-[2.4rem] font-bold leading-tight md:text-[3.6rem]" dir={english ? "ltr" : "rtl"}>
            {t("كل مادة.", "Every course.")}
            <br />
            <span className="text-primary">{t("مصادرها في مكان واحد.", "Its resources in one place.")}</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-muted-foreground" dir="rtl">
            {t("ابحث عن مادتك وشوف الـPlaylists والفيديوهات المتاحة ليها.", "Find your course and explore its playlists and videos.")}
          </p>

          <div className="mt-7 flex min-w-0 max-w-2xl items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 focus-within:border-primary/50">
            <Search className="h-5 w-5 shrink-0 text-primary" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("اكتب اسم المادة أو كودها...", "Search by course name or code…")}
              dir={english ? "ltr" : "rtl"}
              className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className={`mt-6 space-y-4 ${english ? "text-left" : "text-right"}`} dir={english ? "ltr" : "rtl"}>
            <label className="flex min-w-0 max-w-md flex-col gap-2 text-sm font-medium">
              {t("التخصص", "Specialization")}
              <select
                value={selectedSpecialization}
                onChange={(event) => {
                  setSelectedSpecialization(event.target.value as FcdsSpecialization);
                  setSelectedYear("كل السنوات");
                  setSelectedSemester(null);
                }}
                className="min-w-0 w-full max-w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
              >
                {fcdsSpecializations.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("فلترة حسب السنة", "Filter by year")}>
              {["كل السنوات", ...fcdsYearOptions].map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={selectedYear === year}
                  onClick={() => {
                    setSelectedYear(year);
                    setSelectedSemester(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    selectedYear === year
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {english ? ({ "كل السنوات": "All years", "السنة الأولى": "Year 1", "السنة الثانية": "Year 2", "السنة الثالثة": "Year 3", "السنة الرابعة": "Year 4" } as Record<string, string>)[year] ?? year : year}
                </button>
              ))}
            </div>

            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t("فلترة حسب السمستر", "Filter by semester")}
            >
              <span className="ml-1 text-xs font-medium text-muted-foreground">{t("السمستر", "Semester")}</span>
              {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                <button
                  key={semester}
                  type="button"
                  aria-label={`${t("سمستر", "Semester")} ${semester}`}
                  aria-pressed={selectedSemester === semester}
                  onClick={() => {
                    setSelectedSemester(semester);
                    setSelectedYear(fcdsYearForSemester(semester) ?? "كل السنوات");
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold transition-colors ${
                    selectedSemester === semester
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {semester}
                </button>
              ))}
            </div>
          </div>
        </section>

        <FcdsDiscovery />

        <section>
          <div className="mb-8 flex items-end justify-between gap-4" dir={english ? "ltr" : "rtl"}>
            <div>
              <p className="font-mono text-xs text-primary">COURSES</p>

              <h2 className="mt-2 text-3xl font-bold">{t("المواد", "Courses")}</h2>
            </div>

            <p className="text-sm text-muted-foreground">{filteredCourses.length} {t("مواد", "courses")}</p>
          </div>

          <div className="mb-6 flex flex-col items-start gap-3" dir={english ? "ltr" : "rtl"}>
            <button
              type="button"
              onClick={openSuggest}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200/70 bg-gradient-to-r from-amber-300 to-yellow-200 px-6 py-3 text-sm font-bold text-amber-950 shadow-[0_6px_24px_-8px_rgba(245,158,11,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(245,158,11,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
            >
              <Plus className="h-4 w-4" />
              {t("اقترح مصدر", "Suggest a resource")}
            </button>
            <button
              type="button"
              aria-expanded={coursesVisible}
              aria-controls="darb-course-results"
              onClick={() => setCoursesVisible((visible) => !visible)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/10 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-slate-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {coursesVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              {coursesVisible ? t("إخفاء المواد", "Hide courses") : t("إظهار المواد", "Show courses")}
            </button>
          </div>

          <div id="darb-course-results" hidden={!coursesVisible}>
          {coursesLoading && (
            <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
              {t("جاري تحميل المواد...", "Loading courses…")}
            </div>
          )}

          {coursesError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center text-red-300">
              {t("حصلت مشكلة أثناء تحميل المواد.", "There was a problem loading courses.")}
            </div>
          )}

          {!coursesLoading && !coursesError && filteredCourses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}

          {!coursesLoading && !coursesError && filteredCourses.length === 0 && (
            <div
              className="rounded-2xl border border-border p-10 text-center text-muted-foreground"
              dir={english ? "ltr" : "rtl"}
            >
              {selectedSemester === null
                ? t("ما لقينا مادة مطابقة للبحث.", "No courses match your search.")
                : t(`ما لقينا مواد مسجلة لسمستر ${selectedSemester} لحدي هسي.`, `No courses are listed for semester ${selectedSemester} yet.`)}
            </div>
          )}

          </div>
        </section>
      </main>

      {suggestOpen && (
        <Dialog open={suggestOpen} onOpenChange={(open) => !open && closeSuggest()}>
          <DialogContent className="fcds-theme text-foreground max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8 [&>button]:hidden">
            <div className="flex items-start justify-between gap-4">
              <div dir={english ? "ltr" : "rtl"}>
                <p className="font-mono text-xs text-primary">
                  SUGGEST A RESOURCE
                </p>

                <DialogTitle className="mt-2 text-2xl font-bold">
                  {t("اقترح مصدر", "Suggest a resource")}
                </DialogTitle>

                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  {t("الصق رابط فيديو أو Playlist، وحنحدد النوع ونجيب بياناته تلقائياً.", "Paste a video or playlist link. We’ll detect its type and fetch its details.")}
                </DialogDescription>
              </div>

              <button
                type="button"
                onClick={closeSuggest}
                aria-label={t("إغلاق الاقتراح", "Close suggestion form")}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {submitted ? (
              <div
                className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
                dir={english ? "ltr" : "rtl"}
              >
                <p className="text-lg font-semibold text-primary">{t("وصل الاقتراح 👌", "Suggestion received 👌")}</p>

                <p className="mt-2 text-sm text-muted-foreground">{t("حنراجعه قبل إضافته للمكتبة.", "We’ll review it before adding it to the library.")}</p>

                <button
                  type="button"
                  onClick={closeSuggest}
                  className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t("تمام", "Done")}
                </button>
              </div>
            ) : (
              <form onSubmit={submitSuggestion} className="mt-8 space-y-5" dir={english ? "ltr" : "rtl"}>
                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">{t("المادة *", "Course *")}</span>

                  <select
                    value={suggestCourse}
                    onChange={(e) => setSuggestCourse(e.target.value)}
                    required
                    className="min-w-0 w-full max-w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    <option value="">{t("اختر المادة", "Choose a course")}</option>

                    {courses.map((course) => (
                      <option key={course.id} value={course.slug}>
                        {course.name} — {course.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {t("رابط YouTube *", "YouTube URL *")}
                    </span>

                    {fetching && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {t("جاري جلب البيانات...", "Fetching details…")}
                      </span>
                    )}
                  </div>

                  <input
                    type="url"
                    value={suggestUrl}
                    onChange={(e) => onSuggestUrl(e.target.value)}
                    required
                    placeholder="https://youtube.com/..."
                    dir="ltr"
                    className="min-w-0 w-full max-w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  {parseYouTube(suggestUrl) && (
                    <p className="mt-2 text-xs font-medium text-primary" role="status">
                      {suggestKind === "video" ? t("النوع: فيديو", "Detected: video") : t("النوع: Playlist", "Detected: playlist")}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">
                    {suggestKind === "video" ? t("اسم الفيديو *", "Video title *") : t("اسم الـPlaylist *", "Playlist title *")}
                  </span>

                  <input
                    type="text"
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                    required
                    placeholder={t("بيتعبّى تلقائياً", "Filled automatically")}
                    dir="auto"
                    className="min-w-0 w-full max-w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">{t("القناة", "Channel")}</span>

                  <input
                    type="text"
                    value={suggestChannel}
                    onChange={(e) => setSuggestChannel(e.target.value)}
                    placeholder={t("بيتعبّى تلقائياً", "Filled automatically")}
                    dir="auto"
                    className="min-w-0 w-full max-w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">
                    {t("ملاحظة", "Note")}
                    <span className="mx-1 text-muted-foreground">({t("اختيارية", "optional")})</span>
                  </span>

                  <textarea
                    rows={4}
                    value={suggestNote}
                    onChange={(e) => setSuggestNote(e.target.value)}
                    placeholder={
                      suggestKind === "video"
                        ? t("ليه شايف الفيديو ده مفيد؟", "Why do you think this video is useful?")
                        : t("ليه شايف الـPlaylist دي مفيدة؟", "Why do you think this playlist is useful?")
                    }
                    className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <button
                  type="submit"
                  disabled={fetching || submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("جاري الإرسال...", "Submitting…")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("إرسال الاقتراح", "Submit suggestion")}
                    </>
                  )}
                </button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: FcdsCourse }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const { data: playlistCount, isSuccess: countReady } = useQuery({
    queryKey: ["fcds-course-count", course.slug],

    queryFn: async () => {
      const { count, error } = await supabase
        .from("fcds_playlists")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("course_slug", course.slug);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
  });

  return (
    <Link
      to="/fcds/course/$slug"
      params={{ slug: course.slug }}
      className="group rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/[0.03]"
    >
      <div className="flex items-start justify-between">
        <BookOpen className="h-5 w-5 text-primary" />

        <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
      </div>

      <h3 className="mt-10 text-2xl font-semibold">{course.name}</h3>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        {countReady && playlistCount === 0 ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {english ? "No resources yet" : "ما عندها مصادر"}
          </span>
        ) : (
          <span>{countReady ? playlistCount : "—"} {english ? "resources" : "مصادر"}</span>
        )}

        <span>{english ? ({ "السنة الأولى": "Year 1", "السنة الثانية": "Year 2", "السنة الثالثة": "Year 3", "السنة الرابعة": "Year 4" } as Record<string, string>)[course.year] ?? course.year : course.year}</span>
      </div>
    </Link>
  );
}
