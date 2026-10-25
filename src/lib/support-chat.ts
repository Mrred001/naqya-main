import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type SupportConversation = Database["public"]["Tables"]["support_conversations"]["Row"];
export type SupportMessage = Database["public"]["Tables"]["support_messages"]["Row"];
// Preserve Postgres microseconds when two replies share the same millisecond.
export function messageTime(value: string) {
  const fraction = (value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0");
  return new Date(value).getTime() * 1000 + Number(fraction.slice(3, 6));
}
export function hasUnread(conversation: SupportConversation, side: "user" | "admin") {
  const latest =
    side === "user" ? conversation.latest_admin_message_at : conversation.latest_user_message_at;
  const read = side === "user" ? conversation.user_read_at : conversation.admin_read_at;
  return Boolean(latest && (!read || messageTime(latest) > messageTime(read)));
}
export const ownConversationQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["support", "own", userId],
    enabled: Boolean(userId),
    staleTime: 3000,
    refetchInterval: 5000,
    queryFn: async ({ signal }) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", userId)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
export const supportInboxQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["support", "inbox", userId],
    enabled: Boolean(userId),
    staleTime: 3000,
    refetchInterval: 5000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(100)
        .abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
  });
type Cursor = { created_at: string; id: string } | null;
export const supportMessagesQuery = (
  userId: string | undefined,
  conversationId: string | undefined,
) =>
  infiniteQueryOptions({
    queryKey: ["support", "messages", userId, conversationId],
    enabled: Boolean(userId && conversationId),
    initialPageParam: null as Cursor,
    staleTime: 2000,
    refetchInterval: 4000,
    queryFn: async ({ pageParam, signal }) => {
      if (!conversationId) return [];
      let request = supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);
      if (pageParam)
        request = request.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      const { data, error } = await request.abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (page) =>
      page.length === 50
        ? { created_at: page[page.length - 1]!.created_at, id: page[page.length - 1]!.id }
        : undefined,
  });
export function orderedMessages(pages: SupportMessage[][]) {
  return [...new Map(pages.flat().map((m) => [m.id, m])).values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
export async function sendSupportMessage(
  body: string,
  conversationId: string | undefined,
  nonce: string,
) {
  const { data, error } = await supabase.rpc("send_support_message", {
    p_body: body,
    p_client_nonce: nonce,
    ...(conversationId ? { p_conversation: conversationId } : {}),
  });
  if (error) throw error;
  return data;
}

export const supportAdminQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["support", "role", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
