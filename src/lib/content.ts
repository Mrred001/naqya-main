import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string; description: string | null; sort_order: number };
export type MusicStatus = "no_music" | "minimal_music" | "has_music";
export type ContentKind = "video" | "playlist";
export type ContentItem = {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  channel: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  content_type: ContentKind;
  category_id: string | null;
  language: string;
  music_status: MusicStatus;
  recommendation: string | null;
  featured: boolean;
  date_added: string;
  category: Pick<Category, "id" | "name" | "slug"> | null;
  tags: string[];
};

const SELECT = "*, category:categories(id,name,slug), content_tags(tags(name))";

type Row = Omit<ContentItem, "tags"> & { content_tags: { tags: { name: string } | null }[] };
const normalize = (r: Row): ContentItem => {
  const { content_tags, ...rest } = r;
  return { ...rest, tags: (content_tags ?? []).map((t) => t.tags?.name).filter(Boolean) as string[] };
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name");
    if (error) throw error;
    return data as Category[];
  },
});

export const contentQuery = queryOptions({
  queryKey: ["content"],
  queryFn: async () => {
    const { data, error } = await supabase.from("content").select(SELECT).order("date_added", { ascending: false });
    if (error) throw error;
    return (data as unknown as Row[]).map(normalize);
  },
});

export const MUSIC_LABEL: Record<MusicStatus, string> = {
  no_music: "No Music",
  minimal_music: "Minimal Music",
  has_music: "Has Music",
};

export function formatDuration(s: number) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} س ${m} د`;
  return `${m} دقيقة`;
}

export function parseYouTube(url: string): { id: string; kind: ContentKind } | null {
  try {
    const u = new URL(url.trim());
    const list = u.searchParams.get("list");
    if (u.pathname.includes("playlist") && list) return { id: list, kind: "playlist" };
    if (u.hostname.includes("youtu.be")) return { id: u.pathname.slice(1).split("/")[0] ?? "", kind: "video" };
    const v = u.searchParams.get("v");
    if (v) return { id: v, kind: "video" };
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/);
    if (m) return { id: m[2] ?? "", kind: "video" };
    if (list) return { id: list, kind: "playlist" };
  } catch {
    /* invalid */
  }
  return null;
}

export const thumbFor = (c: Pick<ContentItem, "thumbnail_url" | "youtube_id" | "content_type">) =>
  c.thumbnail_url || (c.content_type === "video" ? `https://i.ytimg.com/vi/${c.youtube_id}/hqdefault.jpg` : "");

export const embedFor = (c: Pick<ContentItem, "youtube_id" | "content_type">) =>
  c.content_type === "playlist"
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${c.youtube_id}`
    : `https://www.youtube-nocookie.com/embed/${c.youtube_id}?rel=0`;
