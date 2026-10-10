import { checkSuggestionLink, duplicateSuggestionMessage } from "@/lib/suggestion-links";
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
import { useSitePreferences } from "@/components/site/PreferencesProvider";

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
  english = false,
}: {
  eyebrow: string;
  title: string;
  to?: boolean;
  english?: boolean;
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
          {english ? "View all" : "عرض الكل"}

          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Home() {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
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
          res.error ?? t("ما قدرنا نجيب بيانات المحتوى.", "Could not fetch video details."),
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
        t("تم جلب بيانات المحتوى تلقائياً", "Video details loaded automatically."),
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t("حصلت مشكلة أثناء جلب بيانات YouTube.", "There was a problem fetching YouTube details."),
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
        t("أدخل رابط YouTube صحيح.", "Enter a valid YouTube link."),
      );
      return;
    }

    if (!suggestTitle.trim()) {
      toast.error(
        t("اسم المحتوى مطلوب.", "A title is required."),
      );
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
      const duplicate = error.message?.includes("resource_already_exists") ? "existing"
        : error.message?.includes("resource_already_suggested") ? "pending" : null;
      if (duplicate) {
        toast.error(duplicateSuggestionMessage(duplicate, english));
        return;
      }

      console.error(error);

      toast.error(
        t("حصلت مشكلة أثناء إرسال الاقتراح.", "There was a problem submitting your suggestion."),
      );

      return;
    }

    setSubmitted(true);

    toast.success(
      t("تم إرسال الاقتراح", "Suggestion submitted."),
    );
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 md:px-8">

        {/* Hero */}
        <section className="hero-surface mb-4 mt-6 rounded-3xl border px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">

          <div
            dir={english ? "ltr" : "rtl"}
            lang={language}
            className={english ? "text-left" : "text-right"}
          >
            <p className="text-xs font-medium tracking-[0.15em] text-primary">
              {t("منتقى بيد إنسان، لا خوارزمية", "Curated by a person, not an algorithm")}
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-[1.2] sm:text-5xl md:text-7xl lg:text-7xl">
              {t("ما يستحق", "Worth")}{" "}
              <span className="text-primary">
                {t("وقتك.", "your time.")}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              {t("محتوى منتقى بعناية، بدون موسيقى.", "Carefully selected content, without music.")}
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

        <div className="mb-2" dir={english ? "ltr" : "rtl"}>
          <button
            type="button"
            onClick={() => setSuggestOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200/70 bg-gradient-to-r from-amber-300 to-yellow-200 px-6 py-3 text-sm font-bold text-amber-950 shadow-[0_6px_24px_-8px_rgba(245,158,11,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-8px_rgba(245,158,11,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("اقترح محتوى", "Suggest content")}
          </button>
        </div>

        {/* Recent */}
        <section className="py-12">

          <SectionHead
            eyebrow={t("جديد", "NEW")}
            title={t("أضيف حديثاً", "Recently added")}
            english={english}
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
            eyebrow={t("التصنيفات", "CATEGORIES")}
            title={t("مختارات نقيا", "NAQYA collections")}
            english={english}
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
                      {t("مختارات", "items")}
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

      {/* Suggest Modal */}
      {suggestOpen && (
        <Dialog open onOpenChange={(open) => !open && closeSuggest()}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl md:p-8 [&>button]:hidden">

            <div className="flex items-start justify-between gap-4">

              <div dir={english ? "ltr" : "rtl"}>

                <p className="text-xs tracking-[0.15em] text-primary">
                  SUGGEST CONTENT
                </p>

                <DialogTitle className="mt-2 text-2xl font-bold">
                  {t("اقترح محتوى", "Suggest content")}
                </DialogTitle>

                <p className="mt-2 text-sm text-muted-foreground">
                  {t("عندك فيديو أو Playlist تستحق تكون في نقيا؟", "Have a video or playlist that belongs on NAQYA?")}
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
                dir={english ? "ltr" : "rtl"}
              >

                <p className="text-lg font-semibold text-primary">
                  {t("وصل الاقتراح 👌", "Suggestion received 👌")}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {t("حنراجع المحتوى قبل إضافته لمكتبة نقيا.", "We’ll review it before adding it to NAQYA.")}
                </p>

                <button
                  type="button"
                  onClick={closeSuggest}
                  className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {t("تمام", "Done")}
                </button>

              </div>
            ) : (
              <form
                onSubmit={
                  submitSuggestion
                }
                className="mt-8 space-y-5"
                dir={english ? "ltr" : "rtl"}
              >

                {/* YouTube URL */}
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
                      {t("النوع", "Type")}
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
                    {t("العنوان *", "Title *")}
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
                    placeholder={t("بيتعبّى تلقائياً", "Filled automatically")}
                    dir="auto"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                {/* Channel */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    {t("القناة", "Channel")}
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
                    placeholder={t("بيتعبّى تلقائياً", "Filled automatically")}
                    dir="auto"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50"
                  />

                </label>

                {/* Language */}
                <label className="block">

                  <span className="mb-2 block text-sm text-muted-foreground">
                    {t("اللغة", "Language")}
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
                      {t("الصورة", "Thumbnail")}
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
                    {t("ليه بترشح المحتوى ده؟", "Why are you recommending this content?")}
                    <span className="mr-1 opacity-50">
                      ({t("اختياري", "optional")})
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
                    placeholder={t("شنو الخلاك تشوف إنه يستحق يكون في نقيا؟", "Why do you think this belongs on NAQYA?")}
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
    </>
  );
}
