import { DarbResourceAdmin } from "@/components/admin/DarbResourceAdmin";
import { DarbResourceEditor, type DarbSeed } from "@/components/admin/DarbResourceEditor";
import { darbCoursesQuery, darbResourcesQuery, resourcesForCourse } from "@/lib/darb-resources";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ReportsAdmin } from "@/components/admin/ReportsAdmin";
import { useMusicReview } from "@/components/admin/useMusicReview";
import { MusicFields } from "@/components/admin/MusicFields";
import { validateMusicSelection } from "@/lib/music";
import {
  Pencil,
  Star,
  Trash2,
  Plus,
  X,
  LayoutDashboard,
  Library,
  GraduationCap,
  Inbox,
  Tags,
  Check,
  ExternalLink,
  XCircle,
  BookOpen,
  Calculator,
  ChevronDown,
  Activity,
  ArrowLeft,
} from "lucide-react";
import {
  defaultFcdsSpecialization,
  fcdsSpecializations,
  normalizeFcdsSpecialization,
  type FcdsSpecialization,
  fcdsYearForSemester,
} from "@/lib/fcds";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  contentQuery,
  formatDuration,
  parseYouTube,
  type Category,
  type ContentItem,
  type ContentKind,
  type MusicStatus,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { fetchYouTubeMeta } from "@/lib/youtube.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "NAQYA Admin" },
      {
        name: "description",
        content: "NAQYA administration dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const field =
  "w-full rounded-xl border border-amber-200/15 bg-amber-100/[0.035] px-4 py-2.5 text-sm text-amber-50 outline-none transition-colors placeholder:text-amber-100/35 focus:border-amber-300/55 focus:ring-2 focus:ring-amber-300/10";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-semibold text-[#17130a] transition-all hover:bg-amber-200 disabled:opacity-50";

const ghost =
  "inline-flex items-center gap-1.5 rounded-xl border border-amber-200/15 px-3 py-2 text-xs text-amber-50/65 transition-colors hover:border-amber-200/45 hover:text-amber-50";

function Label({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs uppercase tracking-[0.16em] text-amber-100/50">{label}</span>
      {children}
    </label>
  );
}

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session!.user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });

  return (
    <div className="admin-theme min-h-[100dvh] bg-[#100e09] text-amber-50" dir="ltr">
      {!ready || (session && isLoading) ? (
        <div className="flex min-h-[100dvh] items-center justify-center text-amber-50/40">
          Loading…
        </div>
      ) : !session ? (
        <SignIn />
      ) : !isAdmin ? (
        <div className="mx-auto max-w-md px-5 py-24">
          <h1 className="text-4xl font-bold">Not a curator</h1>

          <p className="mt-4 text-amber-50/50">This account doesn't have curator access.</p>

          <button className={cn(ghost, "mt-6")} onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <Dashboard email={session.user.email ?? ""} />
      )}
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({
            email,
            password,
          })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`,
            },
          });

    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (mode === "up" && !data.session) {
      toast.success("Check your email to confirm your account.");
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-amber-100/10 bg-amber-100/[0.03] p-8"
      >
        <p className="text-xs tracking-[0.2em] text-amber-50/40">NAQYA ADMIN</p>

        <h1 className="mt-3 text-4xl font-bold">Curator</h1>

        <p className="mt-3 text-sm text-amber-50/40">
          {mode === "in" ? "Sign in to manage NAQYA." : "Create curator account."}
        </p>

        <div className="mt-8 space-y-5">
          <Label label="Email">
            <input
              type="email"
              required
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Label>

          <Label label="Password">
            <input
              type="password"
              required
              minLength={6}
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Label>

          <button className={cn(btn, "w-full")} disabled={busy}>
            {busy ? "Loading..." : mode === "in" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            className="w-full text-sm text-amber-50/40 hover:text-amber-50"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "Create account" : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}

type AdminTab =
  | "overview"
  | "general"
  | "calculator"
  | "fcds"
  | "courses"
  | "playlist-per-courses"
  | "suggestions"
  | "categories"
  | "reports";

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<AdminTab>("overview");

  const { data: pending = { fcds: 0, general: 0, total: 0 } } = useQuery({
    queryKey: ["pending-suggestions-count"],

    queryFn: async () => {
      const [fcdsResult, generalResult] = await Promise.all([
        supabase
          .from("fcds_playlist_suggestions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("general_content_suggestions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),
      ]);

      const fcds = fcdsResult.count ?? 0;
      const general = generalResult.count ?? 0;

      return {
        fcds,
        general,
        total: fcds + general,
      };
    },
  });

  const navItems = [
    { id: "calculator" as const, label: "Calculator guide", icon: Calculator },
    { id: "reports" as const, label: "Reports", icon: Inbox },
    {
      id: "overview" as const,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "general" as const,
      label: "General Library",
      icon: Library,
    },
    {
      id: "fcds" as const,
      label: "FCDS Library",
      icon: GraduationCap,
    },
    {
      id: "courses" as const,
      label: "Courses",
      icon: BookOpen,
    },
    { id: "playlist-per-courses" as const, label: "Playlist per Courses", icon: GraduationCap },
    {
      id: "suggestions" as const,
      label: "Pending Suggestions",
      icon: Inbox,
      count: pending.total,
    },
    {
      id: "categories" as const,
      label: "Categories",
      icon: Tags,
    },
  ];

  return (
    <div className="min-h-[100dvh] lg:flex">
      {/* Sidebar */}
      <aside className="border-b border-amber-100/10 bg-[#17140e] lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-5">
          <div className="border-b border-amber-100/15 pb-6">
            <p className="text-xs tracking-[0.22em] text-amber-100/45">NAQYA</p>

            <h1 className="mt-2 text-2xl font-bold">Admin Dashboard</h1>

            <p className="mt-2 truncate text-xs text-amber-100/45">{email}</p>
          </div>

          <Link to="/" className={cn(ghost, "mt-5 justify-center")}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to library selection
          </Link>

          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors",
                    tab === item.id
                      ? "bg-amber-300 text-[#17130a] shadow-[0_8px_24px_-12px_rgba(245,190,75,.8)]"
                      : "text-amber-50/60 hover:bg-amber-100/[0.06] hover:text-amber-50",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>

                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        tab === item.id
                          ? "bg-[#17130a] text-amber-200"
                          : "bg-amber-200/15 text-amber-100",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <button type="button" onClick={() => supabase.auth.signOut()} className={ghost}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="w-full px-5 py-10 md:px-8 lg:ml-72 lg:px-12 lg:py-12">
        {tab === "overview" && <Overview pendingCount={pending.total} />}

        {tab === "general" && <ContentAdmin />}

        {tab === "fcds" && <DarbResourceAdmin />}
        {tab === "calculator" && <DarbResourceAdmin calculator />}

        {tab === "courses" && <CoursesAdmin />}
        {tab === "playlist-per-courses" && (
          <CourseCoverageAdmin onOpenLibrary={() => setTab("fcds")} />
        )}

        {tab === "suggestions" && <SuggestionsAdmin />}

        {tab === "reports" && <ReportsAdmin />}

        {tab === "categories" && <CategoryAdmin />}
      </main>
    </div>
  );
}

function Overview({ pendingCount }: { pendingCount: number }) {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [general, fcds] = await Promise.all([
        supabase.from("content").select("*", {
          count: "exact",
          head: true,
        }),

        supabase.from("fcds_playlists").select("*", {
          count: "exact",
          head: true,
        }),
      ]);

      if (general.error) throw general.error;
      if (fcds.error) throw fcds.error;
      return {
        general: general.count ?? 0,
        fcds: fcds.count ?? 0,
      };
    },
  });

  const cards = [
    {
      label: "General Library",
      value: data?.general ?? "—",
      icon: Library,
    },
    {
      label: "DARB Resources",
      value: data?.fcds ?? "—",
      icon: GraduationCap,
    },
    {
      label: "Pending Suggestions",
      value: pendingCount,
      icon: Inbox,
    },
  ];

  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-amber-50/30">OVERVIEW</p>

      <h2 className="mt-2 text-4xl font-bold">Dashboard</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="flex items-center gap-2 rounded-xl border border-amber-100/10 px-3 py-2"
            >
              <Icon className="h-4 w-4 text-amber-50/40" />

              <p className="text-sm font-semibold">{card.value}</p>

              <p className="text-xs text-amber-50/40">{card.label}</p>
            </div>
          );
        })}
      </div>

      <AnalyticsDashboard />
    </div>
  );
}

/* ------------------------------------------------ */
/* Suggestions */
/* ------------------------------------------------ */

type Suggestion = {
  id: string;
  course_slug: string;
  youtube_url: string;
  title: string;
  channel: string | null;
  note: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
  submitterUsername: string | null;
};

type SuggestionOwner = { user_id: string | null };
type GeneralSuggestion = {
  id: string;
  youtube_url: string;
  youtube_id: string;
  title: string;
  channel: string | null;
  thumbnail_url: string | null;
  content_type: string;
  language: string;
  note: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
};

async function addSubmitterUsernames<T extends SuggestionOwner>(rows: T[]) {
  const userIds = [...new Set(rows.flatMap((row) => (row.user_id ? [row.user_id] : [])))];
  const usernamesById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    if (error) throw error;

    for (const profile of (data ?? []) as Array<{ id: string; username: string }>) {
      usernamesById.set(profile.id, profile.username);
    }
  }

  return rows.map((row) => ({
    ...row,
    submitterUsername: row.user_id ? (usernamesById.get(row.user_id) ?? null) : null,
  }));
}

function SuggestionsAdmin() {
  const [reviewing, setReviewing] = useState<DarbSeed | null>(null);
  const { requestMusicReview, musicReviewDialog } = useMusicReview();
  const { data: generalSuggestions = [] } = useQuery({
    queryKey: ["general-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("general_content_suggestions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return addSubmitterUsernames((data ?? []) as GeneralSuggestion[]);
    },
  });
  const qc = useQueryClient();

  const getMeta = useServerFn(fetchYouTubeMeta);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [languages, setLanguages] = useState<Record<string, "Arabic" | "English">>({});

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["fcds-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fcds_playlist_suggestions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return addSubmitterUsernames(
        (data ?? []) as Array<SuggestionOwner & Omit<Suggestion, "submitterUsername">>,
      );
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-course-coverage"] });
    qc.invalidateQueries({
      queryKey: ["fcds-suggestions"],
    });

    qc.invalidateQueries({
      queryKey: ["admin-overview"],
    });

    qc.invalidateQueries({
      queryKey: ["content"],
    });

    qc.invalidateQueries({
      queryKey: ["fcds-library"],
    });
  };

  const approveFcds = (suggestion: Suggestion) =>
    setReviewing({
      youtube_url: suggestion.youtube_url,
      title: suggestion.title,
      channel: suggestion.channel,
      language: languages[suggestion.id] ?? "Arabic",
      suggestionId: suggestion.id,
      course_links: [{ course_slug: suggestion.course_slug, role: "primary", note: null }],
    });

  const approveGeneral = async (suggestion: Suggestion) => {
    const musicReview = await requestMusicReview(suggestion.youtube_url, suggestion.title);
    if (!musicReview) return;
    setBusyId(suggestion.id);

    const parsed = parseYouTube(suggestion.youtube_url);

    if (!parsed) {
      setBusyId(null);
      toast.error("Invalid YouTube URL");
      return;
    }

    let meta:
      | {
          title?: string;
          channel?: string;
          thumbnail_url?: string;
          duration_seconds?: number | null;
        }
      | undefined;

    try {
      const res = await getMeta({
        data: {
          id: parsed.id,
          kind: parsed.kind,
        },
      });

      meta = res.meta ?? undefined;
    } catch {
      // use suggestion data
    }

    const { error } = await supabase.from("content").insert({
      youtube_url: suggestion.youtube_url.trim(),

      youtube_id: parsed.id,

      title: meta?.title || suggestion.title,

      channel: meta?.channel || suggestion.channel || "Unknown",

      thumbnail_url: meta?.thumbnail_url || null,

      duration_seconds: meta?.duration_seconds ?? 0,

      content_type: parsed.kind,

      category_id: null,

      language: languages[suggestion.id] ?? "Arabic",

      ...musicReview,

      recommendation: suggestion.note || null,

      featured: false,

      date_added: new Date().toISOString(),
    });

    if (error) {
      setBusyId(null);
      toast.error(error.message);
      return;
    }

    const { error: statusError } = await supabase
      .from("fcds_playlist_suggestions")
      .update({
        status: "approved",
      })
      .eq("id", suggestion.id);

    setBusyId(null);

    if (statusError) {
      toast.error(statusError.message);
      return;
    }

    toast.success("Added to General NAQYA");
    refresh();
  };

  const reject = async (suggestion: Suggestion) => {
    if (!confirm(`Delete "${suggestion.title}" permanently?`)) {
      return;
    }

    setBusyId(suggestion.id);

    const { error } = await supabase
      .from("fcds_playlist_suggestions")
      .delete()
      .eq("id", suggestion.id);

    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Suggestion deleted");

    refresh();
  };

  const approveGeneralSuggestion = async (suggestion: GeneralSuggestion) => {
    const musicReview = await requestMusicReview(suggestion.youtube_url, suggestion.title);
    if (!musicReview) return;
    setBusyId(suggestion.id);

    const { error } = await supabase.from("content").insert({
      youtube_url: suggestion.youtube_url,
      youtube_id: suggestion.youtube_id,
      title: suggestion.title,
      channel: suggestion.channel || "Unknown",
      thumbnail_url: suggestion.thumbnail_url || null,
      duration_seconds: 0,
      content_type: suggestion.content_type,
      category_id: null,
      language: suggestion.language || "English",
      ...musicReview,
      recommendation: suggestion.note || null,
      featured: false,
      date_added: new Date().toISOString(),
    });

    if (error) {
      setBusyId(null);
      toast.error(error.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("general_content_suggestions")
      .delete()
      .eq("id", suggestion.id);

    setBusyId(null);

    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }

    toast.success("Added to General NAQYA");
    refresh();
  };

  const rejectGeneralSuggestion = async (suggestion: GeneralSuggestion) => {
    if (!confirm(`Delete "${suggestion.title}"?`)) {
      return;
    }

    setBusyId(suggestion.id);

    const { error } = await supabase
      .from("general_content_suggestions")
      .delete()
      .eq("id", suggestion.id);

    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Suggestion deleted");
    refresh();
  };
  if (reviewing)
    return <DarbResourceEditor initial={reviewing} onDone={() => setReviewing(null)} />;
  return (
    <div>
      {musicReviewDialog}
      <p className="text-xs tracking-[0.2em] text-amber-50/30">INBOX</p>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold">Pending Suggestions</h2>

          <p className="mt-3 text-sm text-amber-50/40">
            Review the suggestion and choose whether it belongs in the general library or FCDS.
          </p>
        </div>

        <span className="text-sm text-amber-50/30">{suggestions.length} pending</span>
      </div>

      {isLoading ? (
        <p className="mt-10 text-amber-50/40">Loading...</p>
      ) : suggestions.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-amber-100/10 p-10 text-center text-amber-50/30">
          No pending suggestions.
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {suggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              className="rounded-2xl border border-amber-100/10 bg-amber-100/[0.025] p-6"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100/10 px-3 py-1 font-mono text-xs text-amber-50/50">
                      {suggestion.course_slug}
                    </span>

                    <span className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/50">
                      {parseYouTube(suggestion.youtube_url)?.kind === "video"
                        ? "Video"
                        : "Playlist"}
                    </span>

                    <span
                      className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/60"
                      dir="auto"
                    >
                      {suggestion.submitterUsername ? `@${suggestion.submitterUsername}` : "Guest"}
                    </span>

                    <span className="text-xs text-amber-50/25">
                      {new Date(suggestion.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-semibold">{suggestion.title}</h3>

                  <p className="mt-1 text-sm text-amber-50/40">
                    {suggestion.channel || "Unknown channel"}
                  </p>

                  {suggestion.note && (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-50/50" dir="auto">
                      {suggestion.note}
                    </p>
                  )}

                  <a
                    href={suggestion.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm text-amber-50/50 hover:text-amber-50"
                  >
                    Open YouTube
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="w-full shrink-0 space-y-3 xl:w-64">
                  <select
                    value={languages[suggestion.id] ?? "Arabic"}
                    onChange={(e) =>
                      setLanguages((prev) => ({
                        ...prev,
                        [suggestion.id]: e.target.value as "Arabic" | "English",
                      }))
                    }
                    className={field}
                  >
                    <option value="English">English</option>

                    <option value="Arabic">Arabic</option>
                  </select>

                  <button
                    type="button"
                    disabled={busyId === suggestion.id}
                    onClick={() => approveFcds(suggestion)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-100/90 disabled:opacity-50"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Add to FCDS
                  </button>

                  <button
                    type="button"
                    disabled={busyId === suggestion.id}
                    onClick={() => approveGeneral(suggestion)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-100/15 px-4 py-2.5 text-sm font-semibold text-amber-50 hover:bg-amber-100/5 disabled:opacity-50"
                  >
                    <Library className="h-4 w-4" />
                    Add to General
                  </button>

                  <button
                    type="button"
                    disabled={busyId === suggestion.id}
                    onClick={() => reject(suggestion)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {generalSuggestions.length > 0 && (
        <section className="mt-14">
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] text-amber-50/30">GENERAL NAQYA</p>

            <h3 className="mt-2 text-2xl font-bold">General Suggestions</h3>
          </div>

          <div className="space-y-4">
            {generalSuggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="rounded-2xl border border-amber-100/10 bg-amber-100/[0.025] p-6"
              >
                <div className="flex flex-col gap-6 lg:flex-row">
                  {suggestion.thumbnail_url && (
                    <img
                      src={suggestion.thumbnail_url}
                      alt=""
                      className="aspect-video w-full rounded-xl object-cover lg:w-52"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/50">
                        GENERAL
                      </span>

                      <span className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/50">
                        {suggestion.content_type}
                      </span>

                      <span className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/50">
                        {suggestion.language}
                      </span>

                      <span
                        className="rounded-full border border-amber-100/10 px-3 py-1 text-xs text-amber-50/60"
                        dir="auto"
                      >
                        {suggestion.submitterUsername
                          ? `@${suggestion.submitterUsername}`
                          : "Guest"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-semibold">{suggestion.title}</h3>

                    <p className="mt-1 text-sm text-amber-50/40">
                      {suggestion.channel || "Unknown channel"}
                    </p>

                    {suggestion.note && (
                      <p className="mt-4 text-sm leading-6 text-amber-50/50" dir="auto">
                        {suggestion.note}
                      </p>
                    )}

                    <a
                      href={suggestion.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-amber-50/50 hover:text-amber-50"
                    >
                      Open YouTube
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 lg:w-52">
                    <button
                      type="button"
                      disabled={busyId === suggestion.id}
                      onClick={() => approveGeneralSuggestion(suggestion)}
                      className="rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-100/90 disabled:opacity-50"
                    >
                      Add to General
                    </button>

                    <button
                      type="button"
                      disabled={busyId === suggestion.id}
                      onClick={() =>
                        setReviewing({
                          youtube_url: suggestion.youtube_url,
                          title: suggestion.title,
                          channel: suggestion.channel,
                          language: suggestion.language,
                          generalSuggestionId: suggestion.id,
                        })
                      }
                      className="min-h-11 rounded-xl border border-amber-200/20 px-4 py-2.5 text-sm"
                    >
                      Add to DARB
                    </button>

                    <button
                      type="button"
                      disabled={busyId === suggestion.id}
                      onClick={() => rejectGeneralSuggestion(suggestion)}
                      className="rounded-xl px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------ */
/* FCDS Library */
/* ------------------------------------------------ */

type FcdsCourseRow = {
  id: string;
  name: string;
  slug: string;
  code: string;
  year: string;
  semester: number | null;
  specialization?: FcdsSpecialization;
  created_at: string;
};

export function CoursePicker({
  courses,
  value,
  disabled,
  onChange,
}: {
  courses: FcdsCourseRow[];
  value: string;
  disabled: boolean;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = courses.find((course) => course.slug === value);
  const selectedLabel = selected
    ? `${selected.name} · ${selected.code}${selected.semester ? ` · Semester ${selected.semester}` : ""}`
    : "Choose a course";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-label="Choose a course"
          className={`${field} flex min-h-11 items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={selected ? "truncate text-amber-50" : "text-amber-100/40"}>
            {selectedLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-200/65" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="admin-theme w-[var(--radix-popover-trigger-width)] min-w-[min(24rem,calc(100vw-2.5rem))] border-amber-200/20 bg-[#1a170f] p-0 text-amber-50 shadow-[0_24px_70px_-24px_rgba(0,0,0,.9)]"
      >
        <Command className="bg-transparent text-amber-50" shouldFilter>
          <CommandInput
            placeholder="Search by course name, code, or semester…"
            className="text-amber-50 placeholder:text-amber-100/35"
          />
          <CommandList className="max-h-64 p-1.5">
            <CommandEmpty className="text-amber-100/55">No matching courses.</CommandEmpty>
            <CommandGroup>
              {courses.map((course) => {
                const label = `${course.name} · ${course.code}${course.semester ? ` · Semester ${course.semester}` : " · No semester"}`;
                return (
                  <CommandItem
                    key={course.slug}
                    value={`${course.name} ${course.code} semester ${course.semester ?? "none"}`}
                    onSelect={() => {
                      onChange(course.slug);
                      setOpen(false);
                    }}
                    className="min-h-10 cursor-pointer text-amber-50/85 data-[selected=true]:bg-amber-200/15 data-[selected=true]:text-amber-50"
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 text-amber-300 ${course.slug === value ? "opacity-100" : "opacity-0"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Draft = {
  youtube_url: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  duration_min: string;
  content_type: ContentKind;
  category_id: string;
  tags: string;
  language: string;
  music_status: MusicStatus | "";
  music_skip_ranges: string;
  recommendation: string;
  featured: boolean;
  date_added: string;
};

const emptyDraft = (): Draft => ({
  youtube_url: "",
  title: "",
  channel: "",
  thumbnail_url: "",
  duration_min: "",
  content_type: "video",
  category_id: "",
  tags: "",
  language: "Arabic",
  music_status: "",
  music_skip_ranges: "",
  recommendation: "",
  featured: false,
  date_added: new Date().toISOString().slice(0, 10),
});

const toDraft = (c: ContentItem): Draft => ({
  youtube_url: c.youtube_url,
  title: c.title,
  channel: c.channel,
  thumbnail_url: c.thumbnail_url ?? "",
  duration_min: String(Math.round(c.duration_seconds / 60)),
  content_type: c.content_type,
  category_id: c.category_id ?? "",
  tags: c.tags.join(", "),
  language: c.language,
  music_status: c.music_reviewed_at ? c.music_status : "",
  music_skip_ranges: c.music_skip_ranges ?? "",
  recommendation: c.recommendation ?? "",
  featured: c.featured,
  date_added: c.date_added.slice(0, 10),
});

function ContentAdmin() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery(contentQuery);

  const { data: categories = [] } = useQuery(categoriesQuery);

  const [editing, setEditing] = useState<{
    id: string | null;
    draft: Draft;
  } | null>(null);

  const refresh = () => {
    qc.invalidateQueries({
      queryKey: ["content"],
    });

    qc.invalidateQueries({
      queryKey: ["admin-overview"],
    });
  };

  const remove = async (c: ContentItem) => {
    if (!confirm(`Delete "${c.title}"?`)) {
      return;
    }

    const { error } = await supabase.from("content").delete().eq("id", c.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Deleted");
    refresh();
  };

  const toggleFeatured = async (c: ContentItem) => {
    const { error } = await supabase
      .from("content")
      .update({
        featured: !c.featured,
      })
      .eq("id", c.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    refresh();
  };

  if (editing) {
    return (
      <ContentForm
        initial={editing.draft}
        id={editing.id}
        categories={categories}
        onDone={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-amber-50/30">GENERAL</p>

      <div className="mt-2 flex items-center justify-between gap-4">
        <h2 className="text-4xl font-bold">General Library</h2>

        <button
          className={btn}
          onClick={() =>
            setEditing({
              id: null,
              draft: emptyDraft(),
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add content
        </button>
      </div>

      <ul className="mt-10 divide-y divide-amber-100/10 border-y border-amber-100/10">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-4 py-4">
            <img
              src={c.thumbnail_url ?? ""}
              alt=""
              className="hidden aspect-video w-28 shrink-0 rounded-lg bg-amber-100/5 object-cover sm:block"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.title}</p>

              <p className="text-xs text-amber-50/35">
                {c.channel} · {c.category?.name ?? "Uncategorized"} ·{" "}
                {formatDuration(c.duration_seconds)} · {c.content_type}
              </p>
            </div>

            <button
              aria-label="Toggle featured"
              onClick={() => toggleFeatured(c)}
              className={cn(
                "p-2",
                c.featured ? "text-yellow-400" : "text-amber-50/30 hover:text-amber-50",
              )}
            >
              <Star className={cn("h-4 w-4", c.featured && "fill-current")} />
            </button>

            <button
              aria-label="Edit"
              onClick={() =>
                setEditing({
                  id: c.id,
                  draft: toDraft(c),
                })
              }
              className="p-2 text-amber-50/30 hover:text-amber-50"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              aria-label="Delete"
              onClick={() => remove(c)}
              className="p-2 text-amber-50/30 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentForm({
  initial,
  id,
  categories,
  onDone,
}: {
  initial: Draft;
  id: string | null;
  categories: Category[];
  onDone: () => void;
}) {
  const [d, setD] = useState(initial);

  const [busy, setBusy] = useState(false);

  const up = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((p) => ({
      ...p,
      [k]: v,
    }));

  const getMeta = useServerFn(fetchYouTubeMeta);

  const [fetching, setFetching] = useState(false);

  const lastFetched = useRef("");

  const onUrl = async (url: string) => {
    const parsed = parseYouTube(url);

    setD((p) => ({
      ...p,
      youtube_url: url,
      ...(parsed
        ? {
            content_type: parsed.kind,
          }
        : {}),
    }));

    if (!parsed || lastFetched.current === parsed.id) {
      return;
    }

    lastFetched.current = parsed.id;

    setFetching(true);

    const res = await getMeta({
      data: {
        id: parsed.id,
        kind: parsed.kind,
      },
    });

    setFetching(false);

    if (!res.meta) {
      toast.error(res.error ?? "Couldn't fetch details.");

      return;
    }

    const m = res.meta;

    setD((p) => ({
      ...p,
      title: m.title || p.title,
      channel: m.channel || p.channel,
      thumbnail_url: m.thumbnail_url || p.thumbnail_url,

      duration_min:
        m.duration_seconds != null
          ? String(Math.max(1, Math.round(m.duration_seconds / 60)))
          : p.duration_min,
    }));

    toast.success(
      m.source === "api"
        ? "Details filled in from YouTube"
        : "Title, channel and thumbnail filled in",
    );
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();

    const parsed = parseYouTube(d.youtube_url);

    if (!parsed) {
      toast.error("That doesn't look like a YouTube link.");

      return;
    }

    const musicError = validateMusicSelection(
      d.music_status,
      d.music_skip_ranges,
      parsed.kind === "video",
    );
    if (musicError) {
      toast.error(musicError);
      return;
    }
    setBusy(true);

    const row = {
      youtube_url: d.youtube_url.trim(),

      youtube_id: parsed.id,

      title: d.title.trim(),

      channel: d.channel.trim(),

      thumbnail_url: d.thumbnail_url.trim() || null,

      duration_seconds: Math.round(Number(d.duration_min || 0) * 60),

      content_type: d.content_type,

      category_id: d.category_id || null,

      language: d.language.trim() || "English",

      music_reviewed_at: new Date().toISOString(),
      music_status: d.music_status as MusicStatus,
      music_skip_ranges:
        d.music_status === "minimal_music" ? d.music_skip_ranges.trim() || null : null,

      recommendation: d.recommendation.trim() || null,

      featured: d.featured,

      date_added: new Date(d.date_added).toISOString(),
    };

    const res = id
      ? await supabase.from("content").update(row).eq("id", id).select("id").single()
      : await supabase.from("content").insert(row).select("id").single();

    if (res.error) {
      setBusy(false);
      toast.error(res.error.message);
      return;
    }

    const contentId = res.data.id;

    const names = [
      ...new Set(
        d.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    await supabase.from("content_tags").delete().eq("content_id", contentId);

    if (names.length) {
      const { data: tags, error } = await supabase
        .from("tags")
        .upsert(
          names.map((name) => ({
            name,
          })),
          {
            onConflict: "name",
          },
        )
        .select("id");

      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }

      await supabase.from("content_tags").insert(
        tags.map((t) => ({
          content_id: contentId,
          tag_id: t.id,
        })),
      );
    }

    setBusy(false);

    toast.success(id ? "Saved" : "Added to library");

    onDone();
  };

  return (
    <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
      <div className="flex items-center justify-between md:col-span-2">
        <h2 className="text-4xl font-bold">{id ? "Edit content" : "Add content"}</h2>

        <button type="button" onClick={onDone} className={ghost}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>

      <Label label="YouTube URL" className="md:col-span-2">
        <input
          required
          className={field}
          value={d.youtube_url}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />

        {fetching && <p className="text-xs text-amber-50/30">Fetching YouTube details...</p>}
      </Label>

      <Label label="Title">
        <input
          required
          className={field}
          value={d.title}
          onChange={(e) => up("title", e.target.value)}
        />
      </Label>

      <Label label="Channel">
        <input
          required
          className={field}
          value={d.channel}
          onChange={(e) => up("channel", e.target.value)}
        />
      </Label>

      <Label label="Thumbnail URL" className="md:col-span-2">
        <input
          className={field}
          value={d.thumbnail_url}
          onChange={(e) => up("thumbnail_url", e.target.value)}
        />
      </Label>

      <Label label="Duration (minutes)">
        <input
          type="number"
          min={0}
          className={field}
          value={d.duration_min}
          onChange={(e) => up("duration_min", e.target.value)}
        />
      </Label>

      <Label label="Content type">
        <select
          className={field}
          value={d.content_type}
          onChange={(e) => up("content_type", e.target.value as ContentKind)}
        >
          <option value="video">Video</option>

          <option value="playlist">Playlist</option>
        </select>
      </Label>

      <Label label="Category">
        <select
          className={field}
          value={d.category_id}
          onChange={(e) => up("category_id", e.target.value)}
        >
          <option value="">Uncategorized</option>

          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Label>

      <Label label="Tags (comma separated)">
        <input className={field} value={d.tags} onChange={(e) => up("tags", e.target.value)} />
      </Label>

      <Label label="Language">
        <select
          className={field}
          value={d.language}
          onChange={(e) => up("language", e.target.value)}
        >
          <option value="English">English</option>

          <option value="Arabic">Arabic</option>
        </select>
      </Label>

      <MusicFields
        status={d.music_status}
        ranges={d.music_skip_ranges}
        kind={d.content_type}
        onStatusChange={(value) => up("music_status", value)}
        onRangesChange={(value) => up("music_skip_ranges", value)}
      />
      <Label label="Why I recommend this" className="md:col-span-2">
        <textarea
          rows={4}
          className={field}
          value={d.recommendation}
          onChange={(e) => up("recommendation", e.target.value)}
        />
      </Label>

      <Label label="Date added">
        <input
          type="date"
          className={field}
          value={d.date_added}
          onChange={(e) => up("date_added", e.target.value)}
        />
      </Label>

      <label className="flex items-center gap-3 self-end pb-2.5 text-sm">
        <input
          type="checkbox"
          checked={d.featured}
          onChange={(e) => up("featured", e.target.checked)}
        />
        Featured
      </label>

      <div className="md:col-span-2">
        <button className={btn} disabled={busy}>
          {busy ? "Saving…" : id ? "Save changes" : "Add to library"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------ */
/* Categories */
/* ------------------------------------------------ */
/* ------------------------------------------------ */
/* FCDS Courses */
/* ------------------------------------------------ */

type FcdsCourseDraft = {
  specialization: FcdsSpecialization;
  name: string;
  code: string;
  year: string;
  semester: number | null;
  slug: string;
};

const emptyCourseDraft = (): FcdsCourseDraft => ({
  specialization: defaultFcdsSpecialization,
  name: "",
  code: "",
  year: "السنة الأولى",
  semester: null,
  slug: "",
});

function courseSlugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function courseYearLabel(year: string) {
  const labels: Record<string, string> = {
    "السنة الأولى": "Year One",
    "السنة الثانية": "Year Two",
    "السنة الثالثة": "Year Three",
    "السنة الرابعة": "Year Four",
  };
  return labels[year] ?? year;
}

function CoursesAdmin() {
  const qc = useQueryClient();

  const [editing, setEditing] = useState<{
    id: string | null;
    draft: FcdsCourseDraft;
  } | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["fcds-courses-admin"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("fcds_courses")
        .select("*")
        .order("semester", { ascending: true, nullsFirst: false })
        .order("year", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return (data ?? []) as FcdsCourseRow[];
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-course-coverage"] });
    qc.invalidateQueries({
      queryKey: ["fcds-courses-admin"],
    });

    qc.invalidateQueries({
      queryKey: ["fcds-courses"],
    });

    qc.invalidateQueries({
      queryKey: ["admin-overview"],
    });
  };

  const editCourse = (course: FcdsCourseRow) => {
    setEditing({
      id: course.id,

      draft: {
        name: course.name,
        code: course.code,
        year: course.year,
        semester: course.semester,
        specialization: normalizeFcdsSpecialization(course.specialization),
        slug: course.slug,
      },
    });
  };

  const remove = async (course: FcdsCourseRow) => {
    const { count, error: countError } = await supabase
      .from("fcds_playlists")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("course_slug", course.slug);

    if (countError) {
      toast.error(countError.message);
      return;
    }

    if ((count ?? 0) > 0) {
      toast.error("This course still has playlists. Move or delete them first.");
      return;
    }

    if (!confirm(`Delete "${course.name}"?`)) {
      return;
    }

    const { error } = await supabase.from("fcds_courses").delete().eq("id", course.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Course deleted");
    refresh();
  };

  if (editing) {
    return (
      <CourseForm
        id={editing.id}
        initial={editing.draft}
        onDone={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-amber-50/30">FCDS</p>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold">Courses</h2>

          <p className="mt-3 text-sm text-amber-50/40">Manage courses in the FCDS library.</p>
        </div>

        <button
          type="button"
          className={btn}
          onClick={() =>
            setEditing({
              id: null,
              draft: emptyCourseDraft(),
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>

      {isLoading ? (
        <p className="mt-10 text-amber-50/40">Loading...</p>
      ) : courses.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-amber-100/10 p-10 text-center text-amber-50/30">
          No courses yet.
        </div>
      ) : (
        <div className="mt-10 divide-y divide-amber-100/10 border-y border-amber-100/10">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{course.name}</p>

                <p className="mt-1 text-xs text-amber-50/35">
                  {course.code} · {courseYearLabel(course.year)} ·{" "}
                  {
                    fcdsSpecializations.find(
                      (option) =>
                        option.value === normalizeFcdsSpecialization(course.specialization),
                    )?.label
                  }
                  {course.semester ? ` · Semester ${course.semester}` : " · No semester"} · /
                  {course.slug}
                </p>
              </div>

              <button
                type="button"
                onClick={() => editCourse(course)}
                className="p-2 text-amber-50/30 hover:text-amber-50"
                aria-label="Edit course"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => remove(course)}
                className="p-2 text-amber-50/30 hover:text-red-400"
                aria-label="Delete course"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseForm({
  id,
  initial,
  onDone,
}: {
  id: string | null;
  initial: FcdsCourseDraft;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FcdsCourseDraft>(key: K, value: FcdsCourseDraft[K]) => {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const onName = (name: string) => {
    setDraft((previous) => ({
      ...previous,
      name,

      slug: id === null ? courseSlugify(name) : previous.slug,
    }));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();

    if (!draft.name.trim()) {
      toast.error("Course name is required.");
      return;
    }

    if (!draft.code.trim()) {
      toast.error("Course code is required.");
      return;
    }

    if (!draft.semester || draft.semester < 1 || draft.semester > 8) {
      toast.error("Choose a course semester from 1 to 8.");
      return;
    }

    if (!draft.slug.trim()) {
      toast.error("Course slug is required.");
      return;
    }

    setSaving(true);

    const row = {
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      year: draft.year,
      semester: draft.semester,
      specialization: draft.specialization,
      slug: draft.slug.trim(),
    };

    const result = id
      ? await supabase.from("fcds_courses").update(row).eq("id", id)
      : await supabase.from("fcds_courses").insert(row);

    setSaving(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(id ? "Course updated" : "Course added");

    onDone();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-amber-50/30">FCDS</p>

          <h2 className="mt-2 text-4xl font-bold">{id ? "Edit Course" : "Add Course"}</h2>
        </div>

        <button type="button" onClick={onDone} className={ghost}>
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <form onSubmit={save} className="mt-10 grid gap-5 md:grid-cols-2">
        <Label label="Course Name">
          <input
            required
            className={field}
            value={draft.name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Data Structures"
          />
        </Label>

        <Label label="Course Code">
          <input
            required
            className={field}
            value={draft.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="CS201"
          />
        </Label>

        <Label label="Specialization">
          <select
            required
            className={field}
            value={draft.specialization}
            onChange={(event) => update("specialization", event.target.value as FcdsSpecialization)}
          >
            {fcdsSpecializations.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Label>

        <Label label="Year">
          <select
            className={field}
            value={draft.year}
            onChange={(e) =>
              setDraft((previous) => ({
                ...previous,
                year: e.target.value,
                semester: null,
              }))
            }
          >
            <option value="السنة الأولى">Year One</option>

            <option value="السنة الثانية">Year Two</option>

            <option value="السنة الثالثة">Year Three</option>

            <option value="السنة الرابعة">Year Four</option>
          </select>
        </Label>

        <Label label="Semester">
          <select
            required
            className={field}
            value={draft.semester ?? ""}
            onChange={(e) => {
              const semester = e.target.value ? Number(e.target.value) : null;
              setDraft((previous) => ({
                ...previous,
                semester,
                year: semester ? (fcdsYearForSemester(semester) ?? previous.year) : previous.year,
              }));
            }}
          >
            <option value="">Choose semester</option>
            {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-amber-50/40">
            Select the course semester from the study plan. The year is set automatically.
          </p>
        </Label>

        <Label label="Slug">
          <input
            required
            className={field}
            value={draft.slug}
            onChange={(e) => update("slug", courseSlugify(e.target.value))}
            placeholder="data-structures"
          />
        </Label>

        <div className="md:col-span-2">
          <button type="submit" className={btn} disabled={saving}>
            {saving ? "Saving..." : id ? "Save Changes" : "Add Course"}
          </button>
        </div>
      </form>
    </div>
  );
}
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function CategoryAdmin() {
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery(categoriesQuery);

  const [name, setName] = useState("");

  const [edit, setEdit] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const refresh = () => {
    qc.invalidateQueries({
      queryKey: ["categories"],
    });

    qc.invalidateQueries({
      queryKey: ["content"],
    });
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      slug: slugify(name),
      sort_order: categories.length + 1,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setName("");
    refresh();
  };

  const save = async () => {
    if (!edit) return;

    const { error } = await supabase
      .from("categories")
      .update({
        name: edit.name.trim(),
        slug: slugify(edit.name),
      })
      .eq("id", edit.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEdit(null);
    refresh();
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Content stays uncategorized.`)) {
      return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", c.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    refresh();
  };

  return (
    <div className="max-w-3xl">
      <p className="text-xs tracking-[0.2em] text-amber-50/30">GENERAL</p>

      <h2 className="mt-2 text-4xl font-bold">Categories</h2>

      <form onSubmit={add} className="mt-10 flex gap-3">
        <input
          className={field}
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button className={btn}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <ul className="mt-8 divide-y divide-amber-100/10 border-y border-amber-100/10">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            {edit?.id === c.id ? (
              <>
                <input
                  autoFocus
                  className={field}
                  value={edit.name}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      name: e.target.value,
                    })
                  }
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />

                <button className={ghost} onClick={save} type="button">
                  <Check className="h-3.5 w-3.5" />
                  Save
                </button>

                <button className={ghost} onClick={() => setEdit(null)} type="button">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">
                  {c.name} <span className="text-xs text-amber-50/30">/{c.slug}</span>
                </span>

                <button
                  aria-label="Edit"
                  onClick={() =>
                    setEdit({
                      id: c.id,
                      name: c.name,
                    })
                  }
                  className="p-2 text-amber-50/30 hover:text-amber-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  aria-label="Delete"
                  onClick={() => remove(c)}
                  className="p-2 text-amber-50/30 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------ */
/* Darb course resource coverage — live DB counts */
/* ------------------------------------------------ */
function CourseCoverageAdmin({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [semester, setSemester] = useState("all");
  const [specialization, setSpecialization] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const courseQuery = useQuery(darbCoursesQuery);
  const resourceQuery = useQuery(darbResourcesQuery);
  const courses = courseQuery.data ?? [];
  const resources = resourceQuery.data ?? [];
  const isPending = courseQuery.isPending || resourceQuery.isPending;
  const error = courseQuery.error || resourceQuery.error;
  const byCourse = new Map(
    courses.map((c) => [c.slug, resourcesForCourse(resources, c.slug, "primary")]),
  );
  const associationCount = resources.reduce((sum, r) => sum + r.course_links.length, 0);
  const covered = courses.filter((c) => (byCourse.get(c.slug)?.length ?? 0) > 0).length;
  const total = courses.length;
  const filtered = courses.filter((c) => {
    const n = byCourse.get(c.slug)?.length ?? 0;
    return (
      (year === "all" || c.year === year) &&
      (semester === "all" || String(c.semester) === semester) &&
      (specialization === "all" ||
        normalizeFcdsSpecialization(c.specialization) === specialization) &&
      (visibility === "all" || (visibility === "empty" ? n === 0 : n > 0)) &&
      `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-amber-50/35">DARB / COVERAGE</p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Playlist per Courses</h2>
        <p className="mt-2 text-sm text-amber-50/50">
          Coverage means at least one course source, not full syllabus completion. Supporting
          explanations are counted separately.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          Couldn't load course coverage. {error.message}
        </p>
      )}
      {isPending ? (
        <p className="text-amber-50/55">Loading coverage…</p>
      ) : error ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Covered courses", `${covered} / ${total}`],
              ["Uncovered courses", String(total - covered)],
              ["Unique resources", String(resources.length)],
              ["Course links", String(associationCount)],
              [
                "Support-only courses",
                String(
                  courses.filter(
                    (c) =>
                      !byCourse.get(c.slug)?.length &&
                      resourcesForCourse(resources, c.slug, "support").length > 0,
                  ).length,
                ),
              ],
              ["Coverage", total ? `${Math.round((covered / total) * 100)}%` : "0%"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-amber-100/10 bg-amber-100/[0.03] p-4"
              >
                <p className="text-2xl font-bold text-amber-200">{value}</p>
                <p className="mt-1 text-xs text-amber-50/55">{label}</p>
              </div>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100/10">
            <div
              className="h-full rounded-full bg-amber-300"
              style={{ width: `${total ? (covered / total) * 100 : 0}%` }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className={field}
              placeholder="Search course or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search courses"
            />
            <select
              className={field}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Year"
            >
              <option value="all">All years</option>
              {["السنة الأولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة"].map((y) => (
                <option key={y} value={y}>
                  {courseYearLabel(y)}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              aria-label="Semester"
            >
              <option value="all">All semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              aria-label="Specialization"
            >
              <option value="all">All specializations</option>
              {fcdsSpecializations.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              aria-label="Coverage"
            >
              <option value="all">All courses</option>
              <option value="filled">With resources</option>
              <option value="empty">Without resources</option>
            </select>
          </div>
          <p className="text-xs text-amber-50/40">
            Showing {filtered.length} of {total} courses. Playlist and video counts are separate.
          </p>
          <div className="divide-y divide-amber-100/10 rounded-2xl border border-amber-100/10">
            {filtered.map((c) => {
              const items = byCourse.get(c.slug) ?? [];
              const playlistCount = items.filter(
                (i) => parseYouTube(i.youtube_url)?.kind === "playlist",
              ).length;
              const videoCount = items.filter(
                (i) => parseYouTube(i.youtube_url)?.kind === "video",
              ).length;
              return (
                <div key={c.id} className="p-4">
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left sm:flex-nowrap"
                    onClick={() => setExpanded(expanded === c.slug ? null : c.slug)}
                    aria-expanded={expanded === c.slug}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-xs text-amber-50/45">
                        {c.code} · {courseYearLabel(c.year)} · Semester {c.semester ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-amber-100/75">
                      {playlistCount} playlists · {videoCount} videos ·{" "}
                      {resourcesForCourse(resources, c.slug, "support").length} supporting
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-amber-50/50",
                        expanded === c.slug && "rotate-180",
                      )}
                    />
                  </button>
                  {expanded === c.slug && (
                    <div className="mt-4 space-y-2 border-t border-amber-100/10 pt-4">
                      {resourcesForCourse(resources, c.slug).length ? (
                        resourcesForCourse(resources, c.slug).map((i) => (
                          <a
                            key={i.id}
                            href={i.youtube_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm text-amber-200 hover:underline"
                          >
                            {i.title} ·{" "}
                            {i.course_links.find((l) => l.course_slug === c.slug)?.role ===
                            "support"
                              ? "Supporting"
                              : "Course source"}{" "}
                            ↗
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-amber-50/50">
                          No resources for this course yet.
                        </p>
                      )}
                      <button type="button" className={ghost} onClick={onOpenLibrary}>
                        Manage in FCDS Library
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!filtered.length && (
              <p className="p-5 text-sm text-amber-50/50">No matching courses.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
