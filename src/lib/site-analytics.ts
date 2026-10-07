import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "naqya-daily-visitor";

export function khartoumDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Khartoum",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function recordDailyVisit(): Promise<void> {
  if (typeof window === "undefined") return;

  const today = khartoumDateKey();
  let saved: { date?: string; key?: string } = {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    try {
      saved = JSON.parse(raw ?? "{}");
    } catch {
      // Invalid stored data; create a fresh key.
    }
  } catch {
    // Without local storage we cannot reliably deduplicate visits per browser.
    return;
  }

  if (saved.date === today && saved.key) return;

  const visitorKey = window.crypto?.randomUUID?.();
  if (!visitorKey) return;

  try {
    // Write before awaiting the network so rapid route changes can't double count.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: today, key: visitorKey }),
    );
  } catch {
    return;
  }

  const { error } = await supabase
    .from("site_visits")
    .insert({ visitor_key: visitorKey } as never);

  if (error && error.code !== "23505") {
    try {
      const current: { date?: string; key?: string } = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "{}",
      );
      if (current.date === today && current.key === visitorKey) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors; analytics should never block the site.
    }
    console.warn("Could not record daily site visit", error.message);
  }
}
