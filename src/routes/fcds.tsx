import { AccountMenu } from "@/components/account/AccountMenu";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Search, Plus, BookOpen, X, Send, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { parseYouTube } from "@/lib/content";
import { fetchYouTubeMeta } from "@/lib/youtube.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/fcds")({
  head: () => ({
    meta: [
      { title: "NAQYA FCDS" },
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
  created_at: string;
};

function FCDS() {
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("كل السنوات");

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

    return matchesSearch && matchesYear;
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

  const openSuggest = (kind: "playlist" | "video") => {
    resetSuggestionForm();
    setSuggestKind(kind);
    setSuggestOpen(true);
  };

  const onSuggestUrl = async (url: string) => {
    setSuggestUrl(url);

    const parsed = parseYouTube(url);

    if (!parsed) {
      return;
    }

    if (parsed.kind !== suggestKind) {
      return;
    }

    if (lastFetched.current === parsed.id) {
      return;
    }

    lastFetched.current = parsed.id;

    setFetching(true);

    try {
      const res = await getMeta({
        data: {
          id: parsed.id,
          kind: parsed.kind,
        },
      });

      if (!res.meta) {
        toast.error(res.error ?? "ما قدرنا نجيب بيانات المحتوى.");

        lastFetched.current = "";
        return;
      }

      const meta = res.meta;

      setSuggestTitle(meta.title || "");
      setSuggestChannel(meta.channel || "");

      toast.success("تم جلب بيانات المحتوى تلقائياً");
    } catch (error) {
      console.error(error);

      toast.error("حصلت مشكلة أثناء جلب بيانات YouTube.");

      lastFetched.current = "";
    } finally {
      setFetching(false);
    }
  };

  const submitSuggestion = async (e: FormEvent) => {
    e.preventDefault();

    if (!suggestCourse) {
      toast.error("اختار المادة.");
      return;
    }

    const parsed = parseYouTube(suggestUrl);

    if (!parsed) {
      toast.error("الرابط ما ظاهر كرابط YouTube صحيح.");
      return;
    }

    if (parsed.kind !== suggestKind) {
      toast.error(
        suggestKind === "video"
          ? "الرابط لازم يكون فيديو YouTube مفرد."
          : "الرابط لازم يكون YouTube Playlist.",
      );
      return;
    }

    if (!suggestTitle.trim()) {
      toast.error(suggestKind === "video" ? "اسم الفيديو مطلوب." : "اسم الـPlaylist مطلوب.");
      return;
    }

    setSubmitting(true);

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
      console.error(error);
      toast.error("حصلت مشكلة أثناء إرسال الاقتراح.");
      return;
    }

    setSubmitted(true);
    toast.success("تم إرسال الاقتراح");
  };

  if (pathname !== "/fcds") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen fcds-theme bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          {/* FCDS Logo - Right */}
          <Link
            to="/"
            className="group flex items-center gap-3"
            aria-label="العودة لاختيار المكتبة"
          >
            <img
              src="/naqya-fcds-logo.png"
              alt="NAQYA FCDS"
              className="h-16 w-16 object-contain transition-transform duration-200 group-hover:scale-105"
            />

            <div className="leading-none">
              <p className="text-base font-bold tracking-[0.12em] transition-colors group-hover:text-primary">
                NAQYA
              </p>

              <p className="mt-1 font-mono text-xs tracking-[0.18em] text-primary">FCDS</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <AccountMenu />
            <ThemeToggle />
            {/* Home - Left */}
            <Link
              to="/"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              الرئيسية
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <section className="hero-surface mb-10 mt-6 rounded-3xl border px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
          <h1 className="max-w-3xl text-5xl font-bold leading-tight md:text-7xl" dir="rtl">
            كل مادة.
            <br />
            <span className="text-primary">مصادرها في مكان واحد.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground" dir="rtl">
            ابحث عن مادتك وشوف الـPlaylists والفيديوهات المتاحة ليها.
          </p>

          <div className="mt-10 flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 focus-within:border-primary/50">
            <Search className="h-5 w-5 shrink-0 text-primary" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اكتب اسم المادة أو كودها..."
              dir="rtl"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2" dir="rtl">
            {["كل السنوات", "السنة الأولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة"].map(
              (year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    selectedYear === year
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {year}
                </button>
              ),
            )}
          </div>
        </section>

        <section>
          <div className="mb-8 flex items-end justify-between gap-4" dir="rtl">
            <div>
              <p className="font-mono text-xs text-primary">COURSES</p>

              <h2 className="mt-2 text-3xl font-bold">المواد</h2>
            </div>

            <p className="text-sm text-muted-foreground">{filteredCourses.length} مواد</p>
          </div>

          {coursesLoading && (
            <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
              جاري تحميل المواد...
            </div>
          )}

          {coursesError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center text-red-300">
              حصلت مشكلة أثناء تحميل المواد.
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
              dir="rtl"
            >
              ما لقينا مادة مطابقة للبحث.
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6 sm:flex-row">
        <button
          type="button"
          onClick={() => openSuggest("playlist")}
          className="flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          اقترح Playlist
        </button>
        <button
          type="button"
          onClick={() => openSuggest("video")}
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg transition-colors hover:border-primary hover:text-primary"
        >
          <Video className="h-4 w-4" />
          اقترح فيديو
        </button>
      </div>

      {suggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div dir="rtl">
                <p className="font-mono text-xs text-primary">
                  {suggestKind === "video" ? "SUGGEST VIDEO" : "SUGGEST PLAYLIST"}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {suggestKind === "video" ? "اقترح فيديو" : "اقترح Playlist"}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {suggestKind === "video"
                    ? "الصق رابط فيديو واحد وحنجيب بياناته تلقائياً."
                    : "الصق رابط الـPlaylist وحنجيب بياناتها تلقائياً."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSuggest}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div
                className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
                dir="rtl"
              >
                <p className="text-lg font-semibold text-primary">وصل الاقتراح 👌</p>

                <p className="mt-2 text-sm text-muted-foreground">حنراجعه قبل إضافته للمكتبة.</p>

                <button
                  type="button"
                  onClick={closeSuggest}
                  className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  تمام
                </button>
              </div>
            ) : (
              <form onSubmit={submitSuggestion} className="mt-8 space-y-5" dir="rtl">
                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">المادة *</span>

                  <select
                    value={suggestCourse}
                    onChange={(e) => setSuggestCourse(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    <option value="">اختر المادة</option>

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
                      {suggestKind === "video" ? "رابط فيديو YouTube *" : "رابط YouTube Playlist *"}
                    </span>

                    {fetching && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        جاري جلب البيانات...
                      </span>
                    )}
                  </div>

                  <input
                    type="url"
                    value={suggestUrl}
                    onChange={(e) => onSuggestUrl(e.target.value)}
                    required
                    placeholder={
                      suggestKind === "video"
                        ? "https://youtube.com/watch?v=..."
                        : "https://youtube.com/playlist?list=..."
                    }
                    dir="ltr"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">
                    {suggestKind === "video" ? "اسم الفيديو *" : "اسم الـPlaylist *"}
                  </span>

                  <input
                    type="text"
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                    required
                    placeholder="بيتعبّى تلقائياً"
                    dir="auto"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">القناة</span>

                  <input
                    type="text"
                    value={suggestChannel}
                    onChange={(e) => setSuggestChannel(e.target.value)}
                    placeholder="بيتعبّى تلقائياً"
                    dir="auto"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-muted-foreground">
                    ملاحظة
                    <span className="mr-1 text-muted-foreground">(اختيارية)</span>
                  </span>

                  <textarea
                    rows={4}
                    value={suggestNote}
                    onChange={(e) => setSuggestNote(e.target.value)}
                    placeholder={
                      suggestKind === "video"
                        ? "ليه شايف الفيديو ده مفيد؟"
                        : "ليه شايف الـPlaylist دي مفيدة؟"
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
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال الاقتراح
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: FcdsCourse }) {
  const { data: playlistCount = 0 } = useQuery({
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
        <span>{playlistCount} مصادر</span>

        <span>{course.year}</span>
      </div>
    </Link>
  );
}
