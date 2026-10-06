import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Plus,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import {
  categoriesQuery,
  contentQuery,
  parseYouTube,
} from "@/lib/content";

import { WeeklyPicks } from "@/components/site/WeeklyPicks";
import { ContentCard } from "@/components/site/ContentCard";
import { SearchBar } from "@/components/site/SearchBar";
import { fetchYouTubeMeta } from "@/lib/youtube.functions";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/naqya")({
  head: () => ({
    meta: [
      { title: "NAQYA" },
      {
        name: "description",
        content:
          "A curated library of videos, playlists and ideas worth watching.",
      },
      {
        property: "og:title",
        content: "NAQYA نقيا — ما يستحق وقتك",
      },
      {
        property: "og:description",
        content:
          "A curated library of videos, playlists and ideas worth watching.",
      },
    ],
  }),

  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(contentQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]),

  component: Home,
});

function SectionHead({
  eyebrow,
  title,
  to,
}: {
  eyebrow: string;
  title: string;
  to?: boolean;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs tracking-[0.15em] text-primary">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-3xl font-bold md:text-4xl">
          {title}
        </h2>
      </div>

      {to && (
        <Link
          to="/explore"
          className="group hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:flex"
        >
          عرض الكل

          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Home() {
  const { data: items } =
    useSuspenseQuery(contentQuery);

  const { data: categories } =
    useSuspenseQuery(categoriesQuery);

  const featured = items.filter(
    (item) => item.featured,
  );



  const recent = items.slice(0, 6);

  const collections = categories
    .map((category) => ({
      ...category,

      items: items.filter(
        (item) =>
          item.category_id === category.id,
      ),
    }))
    .filter(
      (category) =>
        category.items.length > 0,
    );

  /* -------------------------------- */
  /* General suggestions */
  /* -------------------------------- */

  const [suggestOpen, setSuggestOpen] =
    useState(false);

  const [suggestUrl, setSuggestUrl] =
    useState("");

  const [suggestTitle, setSuggestTitle] =
    useState("");

  const [
    suggestChannel,
    setSuggestChannel,
  ] = useState("");

  const [
    suggestThumbnail,
    setSuggestThumbnail,
  ] = useState("");

  const [
    suggestLanguage,
    setSuggestLanguage,
  ] = useState<"Arabic" | "English">(
    "English",
  );

  const [
    suggestType,
    setSuggestType,
  ] = useState<
    "video" | "playlist" | null
  >(null);

  const [suggestNote, setSuggestNote] =
    useState("");

  const [fetching, setFetching] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const lastFetched = useRef("");

  const getMeta =
    useServerFn(fetchYouTubeMeta);

  const resetSuggestion = () => {
    setSuggestUrl("");
    setSuggestTitle("");
    setSuggestChannel("");
    setSuggestThumbnail("");
    setSuggestLanguage("English");
    setSuggestType(null);
    setSuggestNote("");
    setFetching(false);
    setSubmitting(false);
    setSubmitted(false);

    lastFetched.current = "";
  };

  const closeSuggest = () => {
    setSuggestOpen(false);
    resetSuggestion();
  };

  const onSuggestUrl = async (
    url: string,
  ) => {
    setSuggestUrl(url);

    const parsed = parseYouTube(url);

    if (!parsed) {
      setSuggestType(null);
      return;
    }

    setSuggestType(parsed.kind);

    if (
      lastFetched.current === parsed.id
    ) {
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
        toast.error(
          res.error ??
            "ما قدرنا نجيب بيانات المحتوى.",
        );

        lastFetched.current = "";
        return;
      }

      const meta = res.meta;

      setSuggestTitle(
        meta.title || "",
      );

      setSuggestChannel(
        meta.channel || "",
      );

      setSuggestThumbnail(
        meta.thumbnail_url || "",
      );

      toast.success(
        "تم جلب بيانات المحتوى تلقائياً",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "حصلت مشكلة أثناء جلب بيانات YouTube.",
      );

      lastFetched.current = "";
    } finally {
      setFetching(false);
    }
  };

  const submitSuggestion = async (
    e: FormEvent,
  ) => {
    e.preventDefault();

    const parsed =
      parseYouTube(suggestUrl);

    if (!parsed) {
      toast.error(
        "أدخل رابط YouTube صحيح.",
      );
      return;
    }

    if (!suggestTitle.trim()) {
      toast.error(
        "اسم المحتوى مطلوب.",
      );
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from(
        "general_content_suggestions",
      )
      .insert({
        youtube_url:
          suggestUrl.trim(),

        youtube_id:
          parsed.id,

        title:
          suggestTitle.trim(),

        channel:
          suggestChannel.trim() ||
          null,

        thumbnail_url:
          suggestThumbnail.trim() ||
          null,

        content_type:
          parsed.kind,

        language:
          suggestLanguage,

        note:
          suggestNote.trim() ||
          null,

        status: "pending",
      });

    setSubmitting(false);

    if (error) {
      console.error(error);

      toast.error(
        "حصلت مشكلة أثناء إرسال الاقتراح.",
      );

      return;
    }

    setSubmitted(true);

    toast.success(
      "تم إرسال الاقتراح",
    );
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 md:px-8">

        {/* Hero */}
        <section className="hero-surface mb-4 mt-6 rounded-3xl border px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">

          <div
            dir="rtl"
            lang="ar"
            className="text-right"
          >
            <p className="text-xs font-medium tracking-[0.15em] text-primary">
              منتقى بيد إنسان، لا خوارزمية
            </p>

            <h1 className="mt-4 text-5xl font-bold leading-[1.2] md:text-7xl lg:text-7xl">
              ما يستحق{" "}
              <span className="text-primary">
                وقتك.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              محتوى منتقى بعناية، بدون موسيقى.
            </p>
          </div>

          <SearchBar className="mt-10 max-w-2xl" />

          <nav className="mt-8 flex flex-wrap gap-2">
            {categories.map(
              (category) => (
                <Link
                  key={category.id}
                  to="/explore"
                  search={{
                    category:
                      category.slug,
                  }}
                  className="rounded-full border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span dir="auto">
                    {category.name}
                  </span>
                </Link>
              ),
            )}
          </nav>

        </section>

        <WeeklyPicks items={featured} />

        {/* Recent */}
        <section className="py-12">

          <SectionHead
            eyebrow="جديد"
            title="أضيف حديثاً"
            to
          />

          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">

            {recent.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
              />
            ))}

          </div>

        </section>

        {/* Collections */}
        <section className="py-12">

          <SectionHead
            eyebrow="التصنيفات"
            title="مختارات نقيا"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {collections.map(
              (collection) => (
                <Link
                  key={collection.id}
                  to="/explore"
                  search={{
                    category:
                      collection.slug,
                  }}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-card p-5"
                >

                  <div className="absolute inset-0 grid grid-cols-2 gap-0.5 opacity-40 transition-all duration-700 group-hover:scale-105 group-hover:opacity-60">

                    {collection.items
                      .slice(0, 4)
                      .map((item) => (
                        <img
                          key={item.id}
                          src={
                            item.thumbnail_url ??
                            ""
                          }
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ))}

                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                  <div className="relative">

                    <p className="text-xs text-muted-foreground">
                      {
                        collection.items
                          .length
                      }{" "}
                      مختارات
                    </p>

                    <h3
                      className="mt-1 text-2xl font-bold group-hover:text-primary"
                      dir="auto"
                    >
                      {collection.name}
                    </h3>

                  </div>

                </Link>
              ),
            )}

          </div>

        </section>

      </div>

      {/* Suggest Content Button */}
      <button
        type="button"
        onClick={() =>
          setSuggestOpen(true)
        }
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        اقترح محتوى
      </button>

      {/* Suggest Modal */}
      {suggestOpen && (
        <Dialog open onOpenChange={(open) => !open && closeSuggest()}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl md:p-8 [&>button]:hidden">

            <div className="flex items-start justify-between gap-4">

              <div dir="rtl">

                <p className="text-xs tracking-[0.15em] text-primary">
                  SUGGEST CONTENT
                </p>

                <DialogTitle className="mt-2 text-2xl font-bold">
                  اقترح محتوى
                </DialogTitle>

                <p className="mt-2 text-sm text-muted-foreground">
                  عندك فيديو أو Playlist تستحق تكون في نقيا؟
                </p>

              </div>

              <button
                type="button"
                onClick={closeSuggest}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {submitted ? (
              <div
                className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
                dir="rtl"
              >

                <p className="text-lg font-semibold text-primary">
                  وصل الاقتراح 👌
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  حنراجع المحتوى قبل إضافته لمكتبة نقيا.
                </p>

                <button
                  type="button"
                  onClick={closeSuggest}
                  className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  تمام
                </button>

              </div>
            ) : (
              <form
                onSubmit={
                  submitSuggestion
                }
                className="mt-8 space-y-5"
                dir="rtl"
              >

                {/* YouTube URL */}
                <label className="block">

                  <div className="mb-2 flex items-center justify-between gap-3">

                    <span className="text-sm text-muted-foreground">
                      رابط YouTube *
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
                    onChange={(e) =>
                      onSuggestUrl(
                        e.target.value,
                      )
                    }
                    required
                    placeholder="https://youtube.com/..."
                    dir="ltr"
                    className="w-full rounded-xl border bg-background px-4 py-3 text-left outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                {/* Detected Type */}
                {suggestType && (
                  <div className="flex items-center justify-between rounded-xl border bg-secondary/30 px-4 py-3">

                    <span className="text-sm text-muted-foreground">
                      النوع
                    </span>

                    <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                      {suggestType ===
                      "video"
                        ? "Video"
                        : "Playlist"}
                    </span>

                  </div>
                )}

                {/* Title */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    العنوان *
                  </span>

                  <input
                    type="text"
                    value={suggestTitle}
                    onChange={(e) =>
                      setSuggestTitle(
                        e.target.value,
                      )
                    }
                    required
                    placeholder="بيتعبّى تلقائياً"
                    dir="auto"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                {/* Channel */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    القناة
                  </span>

                  <input
                    type="text"
                    value={
                      suggestChannel
                    }
                    onChange={(e) =>
                      setSuggestChannel(
                        e.target.value,
                      )
                    }
                    placeholder="بيتعبّى تلقائياً"
                    dir="auto"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                {/* Language */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    اللغة
                  </span>

                  <select
                    value={
                      suggestLanguage
                    }
                    onChange={(e) =>
                      setSuggestLanguage(
                        e.target
                          .value as
                          | "Arabic"
                          | "English",
                      )
                    }
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition-colors focus:border-primary/50"
                  >
                    <option value="English">
                      English
                    </option>

                    <option value="Arabic">
                      Arabic
                    </option>
                  </select>

                </label>

                {/* Thumbnail Preview */}
                {suggestThumbnail && (
                  <div>

                    <p className="mb-2 text-sm text-muted-foreground">
                      الصورة
                    </p>

                    <img
                      src={
                        suggestThumbnail
                      }
                      alt=""
                      className="aspect-video w-full rounded-xl border object-cover"
                    />

                  </div>
                )}

                {/* Note */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    ليه بترشح المحتوى ده؟
                    <span className="mr-1 opacity-50">
                      (اختياري)
                    </span>
                  </span>

                  <textarea
                    rows={4}
                    value={
                      suggestNote
                    }
                    onChange={(e) =>
                      setSuggestNote(
                        e.target.value,
                      )
                    }
                    placeholder="شنو الخلاك تشوف إنه يستحق يكون في نقيا؟"
                    className="w-full resize-none rounded-xl border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                <button
                  type="submit"
                  disabled={
                    fetching ||
                    submitting
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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

          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

