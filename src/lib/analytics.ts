import { supabase } from "@/integrations/supabase/client";

export type AnalyticsLibrary = "general" | "fcds" | "site";
export type AnalyticsEvent = "page_view" | "resource_open" | "save" | "share" | "search";
const BROWSER_KEY = "naqya-analytics-browser-v1";
const SESSION_KEY = "naqya-analytics-session-v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function libraryForPath(path: string): AnalyticsLibrary {
  if (path.startsWith("/fcds")) return "fcds";
  if (/^\/(naqya|explore|watch)(\/|$)/.test(path)) return "general";
  return "site";
}
export function cleanSearchTerm(term: string): string | null {
  const value = term.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
  return value.length >= 2 && !/(@|https?:\/\/|www\.|[0-9]{7,})/i.test(value) ? value : null;
}
export function trafficSource(
  url: string,
  referrer: string,
): { source: string; campaign: string | null } {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9_. -]/g, "")
      .slice(0, 80);
  try {
    const current = new URL(url);
    const tagged = clean(current.searchParams.get("utm_source") ?? "");
    const campaign = clean(current.searchParams.get("utm_campaign") ?? "") || null;
    if (tagged) return { source: tagged, campaign };
    if (!referrer) return { source: "direct", campaign };
    const ref = new URL(referrer);
    if (ref.hostname === current.hostname) return { source: "direct", campaign };
    const host = ref.hostname.toLowerCase();
    return {
      source: /(^|\.)google\./.test(host)
        ? "google"
        : /(^|\.)instagram\.com$/.test(host) || host === "l.instagram.com"
          ? "instagram"
          : /(^|\.)whatsapp\.com$/.test(host) || host === "wa.me"
            ? "whatsapp"
            : clean(host),
      campaign,
    };
  } catch {
    return { source: "direct", campaign: null };
  }
}
export async function trackAnalytics(
  event: AnalyticsEvent,
  library: AnalyticsLibrary,
  details: {
    resourceId?: string;
    courseSlug?: string;
    path?: string;
    term?: string;
    results?: number;
  } = {},
): Promise<void> {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  try {
    let visitor = localStorage.getItem(BROWSER_KEY);
    if (!visitor || !UUID.test(visitor)) {
      visitor = window.crypto.randomUUID();
      localStorage.setItem(BROWSER_KEY, visitor);
    }
    const now = Date.now();
    let session: { id: string; lastAt: number; source: string; campaign: string | null } | null =
      null;
    try {
      session = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    } catch {
      /* reset damaged session */
    }
    if (
      !session ||
      !UUID.test(session.id) ||
      !Number.isFinite(session.lastAt) ||
      now - session.lastAt > 30 * 60_000 ||
      now < session.lastAt
    ) {
      session = {
        id: window.crypto.randomUUID(),
        lastAt: now,
        ...trafficSource(window.location.href, document.referrer),
      };
    }
    session.lastAt = now;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const term = details.term ? cleanSearchTerm(details.term) : null;
    if (event === "search" && !term) return;
    await supabase.rpc("record_site_event", {
      p_visitor: visitor,
      p_session: session.id,
      p_library: library,
      p_event: event,
      ...(details.resourceId ? { p_resource: details.resourceId } : {}),
      ...(details.courseSlug ? { p_course: details.courseSlug } : {}),
      ...(details.path ? { p_path: details.path } : {}),
      ...(term ? { p_term: term } : {}),
      ...(details.results !== undefined ? { p_results: details.results } : {}),
      p_source: session.source,
      ...(session.campaign ? { p_campaign: session.campaign } : {}),
    });
  } catch {
    /* Telemetry must never block content, saving, or sharing. */
  }
}
export function recordPageAnalytics(path: string): void {
  if (/^\/(admin|auth)(\/|$)/.test(path)) return;
  const library = libraryForPath(path);
  const courseSlug = path.match(/^\/fcds\/course\/([^/]+)$/)?.[1];
  void trackAnalytics("page_view", library, { path, ...(courseSlug ? { courseSlug } : {}) });
  const resourceId = path.match(/^\/watch\/([^/]+)$/)?.[1];
  if (resourceId && UUID.test(resourceId))
    void trackAnalytics("resource_open", "general", { resourceId });
}
