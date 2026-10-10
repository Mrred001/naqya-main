import { supabase } from "@/integrations/supabase/client";

export type DuplicateSuggestion = "existing" | "pending";

export async function checkSuggestionLink(url: string): Promise<DuplicateSuggestion | null> {
  const { data, error } = await supabase.rpc("suggestion_link_status", { resource_url: url.trim() } as never);
  if (error) throw error;
  return data === "existing" || data === "pending" ? data : null;
}

export function duplicateSuggestionMessage(status: DuplicateSuggestion, english: boolean) {
  if (status === "existing") return english
    ? "This video or playlist is already in the library."
    : "الفيديو أو الـPlaylist دي موجودة أصلاً في المكتبة.";
  return english
    ? "This link has already been suggested and is awaiting review."
    : "الرابط ده مقترح من قبل وفي انتظار المراجعة.";
}
