import { SaveButton } from "@/components/account/SaveButton";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { parseYouTube } from "@/lib/content";

export const Route = createFileRoute("/fcds/course/$slug")({
  component: CoursePage,
});

type FcdsCourse = {
  id: string;
  name: string;
  slug: string;
  code: string;
  year: string;
  created_at: string;
};

type FcdsPlaylistRow = {
  id: string;
  course_slug: string;
  youtube_url: string;
  title: string;
  channel: string | null;
  language: string;
  thumbnail_url: string | null;
  created_at: string;
};

function CoursePage() {
  const { slug } = Route.useParams();

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ["fcds-course", slug],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("fcds_courses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as FcdsCourse | null;
    },
  });

  const {
    data: sources = [],
    isLoading: playlistsLoading,
    error: playlistsError,
  } = useQuery({
    queryKey: ["fcds-course-playlists", slug],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("fcds_playlists")
        .select("*")
        .eq("course_slug", slug)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return (data ?? []) as FcdsPlaylistRow[];
    },
  });

  const videos = sources.filter((source) => parseYouTube(source.youtube_url)?.kind === "video");
  const playlists = sources.filter((source) => parseYouTube(source.youtube_url)?.kind !== "video");

  if (courseLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center fcds-theme bg-background text-muted-foreground">
        جاري تحميل المادة...
      </div>
    );
  }

  if (courseError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center fcds-theme bg-background text-red-300">
        حصلت مشكلة أثناء تحميل المادة.
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center fcds-theme bg-background text-foreground">
        المادة غير موجودة
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] fcds-theme bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="mb-6 flex justify-end gap-3">
          <AccountMenu />
          <ThemeToggle />
        </div>

        <Link
          to="/fcds"
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← العودة للمواد
        </Link>

        <section className="mt-16">
          <p className="font-mono text-sm text-primary">COURSE</p>

          <h1 className="mt-3 text-5xl font-bold md:text-7xl">{course.name}</h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono text-primary">{course.code}</span>

            <span>•</span>

            <span>{course.year}</span>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-primary">PLAYLISTS</p>

              <h2 className="mt-2 text-3xl font-bold">المصادر المتاحة</h2>
            </div>

            <p className="text-sm text-muted-foreground">{playlists.length} Playlists</p>
          </div>

          {playlistsLoading && (
            <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">
              جاري تحميل المصادر...
            </div>
          )}

          {playlistsError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-300">
              حصلت مشكلة أثناء تحميل الـPlaylists.
            </div>
          )}

          {!playlistsLoading && !playlistsError && sources.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center" dir="rtl">
              <p className="text-lg font-semibold">ما في مصادر للمادة دي حالياً.</p>

              <p className="mt-2 text-sm text-muted-foreground">
                لو عندك فيديو أو Playlist مفيدة، اقترحها من صفحة FCDS.
              </p>
            </div>
          )}

          {!playlistsLoading && !playlistsError && playlists.length > 0 && (
            <div className="grid gap-4">
              {playlists.map((playlist) => (
                <article key={playlist.id} className="space-y-3">
                  <a
                    href={playlist.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:bg-primary/[0.03] md:flex"
                  >
                    {playlist.thumbnail_url && (
                      <img
                        src={playlist.thumbnail_url}
                        alt=""
                        className="aspect-video w-full object-cover md:w-64"
                      />
                    )}

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-6 p-6">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold" dir="auto">
                          {playlist.title}
                        </h3>

                        <p className="mt-2 text-sm text-muted-foreground" dir="auto">
                          {playlist.channel || "Unknown channel"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                            {playlist.language}
                          </span>

                          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                            YouTube
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-sm text-primary">
                        <span>WATCH</span>

                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </div>
                  </a>
                  <SaveButton kind="fcds" id={playlist.id} />
                </article>
              ))}
            </div>
          )}

          {!playlistsLoading && !playlistsError && videos.length > 0 && (
            <details className="group mt-6 rounded-2xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3" dir="rtl">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="font-semibold">فيديوهات منفردة</span>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-muted-foreground">
                    {videos.length}
                  </span>
                </span>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 border-t border-border p-4 sm:p-5">
                {videos.map((video) => (
                  <article key={video.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
                    <a
                      href={video.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="grid aspect-video w-28 shrink-0 place-items-center rounded-lg bg-accent">
                          <Video className="h-5 w-5 text-primary" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium" dir="auto">{video.title}</span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground" dir="auto">
                          {video.channel || "YouTube"}
                        </span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                    </a>
                    <SaveButton kind="fcds" id={video.id} />
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>
      </main>
    </div>
  );
}
