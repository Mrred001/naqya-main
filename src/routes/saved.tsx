import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { contentQuery } from "@/lib/content";
import { bookmarksQuery } from "@/lib/bookmarks";
import { ContentCard } from "@/components/site/ContentCard";
import { SaveButton } from "@/components/account/SaveButton";
import { useAccount } from "@/components/account/AccountProvider";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "المحفوظات — نقيا ودرب" }, { name: "robots", content: "noindex" }] }),
  component: Saved,
});
type Playlist = { id: string; course_slug: string; title: string; channel: string | null };
const playlistsQuery = queryOptions({
  queryKey: ["fcds-playlists"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("fcds_playlists")
      .select("id,course_slug,title,channel");
    if (error) throw error;
    return (data ?? []) as Playlist[];
  },
});
function Saved() {
  const { user, ready } = useAccount();
  const bookmarks = useQuery(bookmarksQuery(user?.id));
  const general = useQuery({ ...contentQuery, enabled: Boolean(user) });
  const fcds = useQuery({ ...playlistsQuery, enabled: Boolean(user) });
  const failed = bookmarks.isError || general.isError || fcds.isError;
  const loading =
    !ready || Boolean(user && (bookmarks.isPending || general.isPending || fcds.isPending));
  return (
    <section className="mx-auto max-w-7xl space-y-6 px-5 py-12 md:px-8">
      <h1 className="text-4xl font-bold">المحفوظات</h1>
      <p className="text-muted-foreground">مصادرك من نقيا ودرب، محفوظة مع حسابك.</p>
      {loading ? (
        <p role="status">جاري التحميل…</p>
      ) : !user ? (
        <div className="max-w-md space-y-4 rounded-2xl border p-6">
          <p>سجّل دخولك عشان تفتح محفوظاتك. التصفّح والمشاهدة متاحين بدون حساب.</p>
          <GoogleSignIn />
        </div>
      ) : failed ? (
        <div role="alert">
          <p>ما قدرنا نحمّل المحفوظات.</p>
          <button
            type="button"
            className="mt-3 text-primary"
            onClick={() => {
              void bookmarks.refetch();
              void general.refetch();
              void fcds.refetch();
            }}
          >
            حاول تاني
          </button>
        </div>
      ) : !bookmarks.data?.length ? (
        <div className="rounded-2xl border p-8">
          <p>لسه ما حفظت مصادر. اضغط «احفظ لوقت لاحق» على المصدر البتهمك.</p>
          <div className="mt-4 flex gap-6">
            <Link to="/naqya" className="text-primary">
              تصفّح نقيا
            </Link>
            <Link to="/fcds" className="text-primary">
              تصفّح الكلية
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.data.map((row) => {
            const item = general.data?.find((entry) => entry.id === row.content_id);
            const playlist = fcds.data?.find((entry) => entry.id === row.fcds_playlist_id);
            return (
              <article key={row.id} className="space-y-4 rounded-2xl border p-4">
                {item ? (
                  <ContentCard item={item} showSave={false} />
                ) : playlist ? (
                  <div className="space-y-3">
                    <span className="text-xs text-primary">Darb FCDS</span>
                    <h2 dir="auto" className="text-xl font-bold">
                      {playlist.title}
                    </h2>
                    <p dir="auto" className="text-muted-foreground">
                      {playlist.channel}
                    </p>
                    <Link
                      to="/fcds/course/$slug"
                      params={{ slug: playlist.course_slug }}
                      className="inline-block text-primary"
                    >
                      افتح صفحة المادة
                    </Link>
                  </div>
                ) : (
                  <p>المصدر ده ما متاح حالياً.</p>
                )}
                <SaveButton
                  kind={row.content_id ? "general" : "fcds"}
                  id={row.content_id ?? row.fcds_playlist_id!}
                />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
