import { useEffect, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  orderedMessages,
  messageTime,
  sendSupportMessage,
  supportMessagesQuery,
  type SupportConversation as Conversation,
} from "@/lib/support-chat";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
export function SupportConversation({
  userId,
  conversation,
  admin = false,
}: {
  userId: string;
  conversation: Conversation | null;
  admin?: boolean;
}) {
  const { language } = useSitePreferences();
  const en = language === "en";
  const t = (ar: string, eng: string) => (en ? eng : ar);
  const qc = useQueryClient();
  const query = useInfiniteQuery(supportMessagesQuery(userId, conversation?.id));
  const messages = orderedMessages(query.data?.pages ?? []);
  const last = messages[messages.length - 1];
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [readAttempt, setReadAttempt] = useState(0);
  const retry = useRef<{ body: string; nonce: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lastRead = useRef("");
  const stickToBottom = useRef(true);
  useEffect(() => {
    if (last?.id && stickToBottom.current && scroller.current)
      scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [last?.id]);
  useEffect(() => {
    if (!conversation || !last || !atBottom || query.isError || lastRead.current === last.id)
      return;
    const read = admin ? conversation.admin_read_at : conversation.user_read_at;
    if (read && messageTime(read) >= messageTime(last.created_at)) return;
    let active = true;
    lastRead.current = last.id;
    void Promise.resolve(
      supabase.rpc("mark_support_read", {
        p_conversation: conversation.id,
        p_through: last.created_at,
      }),
    )
      .then(({ error }) => {
        if (!active) return;
        if (error) {
          lastRead.current = "";
          setReadError(true);
        } else {
          setReadError(false);
          void qc.invalidateQueries({ queryKey: ["support", "own"] });
          void qc.invalidateQueries({ queryKey: ["support", "inbox"] });
        }
      })
      .catch(() => {
        if (active) {
          lastRead.current = "";
          setReadError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [conversation, last, admin, qc, query.isError, atBottom, readAttempt]);
  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 3000 || busy) return;
    if (!retry.current || retry.current.body !== body)
      retry.current = { body, nonce: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await sendSupportMessage(body, conversation?.id, retry.current.nonce);
      setDraft("");
      retry.current = null;
      stickToBottom.current = true;
      await qc.invalidateQueries({ queryKey: ["support"] });
    } catch (failure) {
      const message = (failure as { message?: string }).message ?? "";
      setError(
        message.includes("Too many")
          ? t(
              "رسائل كتيرة في وقت قصير، جرّب بعد شوية.",
              "Too many messages. Please try again shortly.",
            )
          : t(
              "ما قدرنا نرسل الرسالة. كلامك محفوظ هنا، جرّب تاني.",
              "Could not send. Your draft is still here; try again.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground"
      dir={en ? "ltr" : "rtl"}
    >
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">
          {admin
            ? (conversation?.display_name ?? t("المحادثة", "Conversation"))
            : t("محادثتك مع أحمد", "Your conversation with Ahmed")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "الرسائل خاصة وبتتحدّث تلقائياً أثناء فتح الشات. الرد ممكن يتأخر.",
            "Private messages refresh automatically while the chat is open. Replies may take time.",
          )}
        </p>
      </div>
      <div
        ref={scroller}
        onScroll={() => {
          const node = scroller.current;
          if (node) {
            const bottom = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
            stickToBottom.current = bottom;
            setAtBottom(bottom);
          }
        }}
        className="h-[45dvh] min-h-48 space-y-3 overflow-y-auto overscroll-contain p-4 sm:h-[50dvh]"
        role="log"
        aria-label={t("رسائل المحادثة", "Conversation messages")}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {query.hasNextPage && (
          <button
            type="button"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              stickToBottom.current = false;
              void query.fetchNextPage();
            }}
            className="mx-auto block min-h-10 rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
          >
            {t("رسائل أقدم", "Older messages")}
          </button>
        )}
        {conversation && query.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("جاري تحميل المحادثة…", "Loading conversation…")}
          </p>
        ) : query.isError ? (
          <div role="alert" className="text-sm">
            <p>{t("تعذر تحميل الرسائل.", "Could not load messages.")}</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="min-h-10 underline"
            >
              {t("حاول تاني", "Retry")}
            </button>
          </div>
        ) : !messages.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("اكتب رسالتك عشان تبدأ المحادثة.", "Write a message to start the conversation.")}
          </p>
        ) : (
          messages.map((message) => {
            const own = message.sender_id === userId;
            return (
              <div key={message.id} className={`flex ${own ? "justify-start" : "justify-end"}`}>
                <article
                  className={`max-w-[88%] space-y-1 rounded-2xl px-4 py-3 ${own ? "bg-primary/15" : "border bg-background"}`}
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {message.sender_role === "admin"
                      ? t("أحمد", "Ahmed")
                      : own
                        ? t("إنت", "You")
                        : t("الطالب", "Student")}
                  </p>
                  <p
                    dir="auto"
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]"
                  >
                    {message.body}
                  </p>
                  <time
                    dateTime={message.created_at}
                    className="block text-[10px] text-muted-foreground"
                  >
                    {new Date(message.created_at).toLocaleString(en ? "en-GB" : "ar-EG", {
                      timeZone: "Africa/Cairo",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </article>
              </div>
            );
          })
        )}
      </div>
      {readError && (
        <p role="status" className="px-4 text-xs text-muted-foreground">
          {t("تعذر تحديث علامة القراءة مؤقتاً.", "Read status could not be updated yet.")}{" "}
          <button
            type="button"
            onClick={() => setReadAttempt((n) => n + 1)}
            className="min-h-10 underline"
          >
            {t("حاول تاني", "Retry")}
          </button>
        </p>
      )}
      <form onSubmit={send} className="space-y-2 border-t p-3">
        <label className="sr-only" htmlFor={`support-draft-${conversation?.id ?? "new"}`}>
          {t("رسالتك", "Your message")}
        </label>
        <textarea
          id={`support-draft-${conversation?.id ?? "new"}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={3000}
          rows={3}
          placeholder={t("اكتب رسالتك…", "Write a message…")}
          disabled={busy}
          className="min-h-20 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{draft.length}/3000</span>
          <button
            type="submit"
            disabled={busy || !draft.trim() || Boolean(conversation && query.isError)}
            className="min-h-11 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {busy ? t("جاري الإرسال…", "Sending…") : t("إرسال", "Send")}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
