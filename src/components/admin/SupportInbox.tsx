import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/components/account/AccountProvider";
import { SupportConversation } from "@/components/chat/SupportConversation";
import { hasUnread, supportInboxQuery } from "@/lib/support-chat";
export function SupportInbox() {
  const { user } = useAccount();
  const query = useQuery(supportInboxQuery(user?.id));
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const current = query.data?.find((c) => c.id === selected) ?? null;
  const filtered = (query.data ?? []).filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold">Chats</h2>
        <p className="mt-2 text-sm text-amber-100/50">
          Private two-way conversations with signed-in users. Latest 100 conversations, refreshed
          automatically. Times shown in Egypt time.
        </p>
      </div>
      {query.isPending ? (
        <p role="status">Loading conversations…</p>
      ) : query.isError ? (
        <p role="alert">
          Could not load conversations.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3">
            <input
              type="search"
              aria-label="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className="min-h-11 w-full rounded-xl border border-amber-100/20 bg-transparent px-3 py-2 text-sm"
            />
            <div className="max-h-[32dvh] space-y-2 overflow-y-auto lg:max-h-[65dvh]">
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  aria-pressed={selected === c.id}
                  className={`w-full space-y-2 rounded-xl border p-4 text-start text-sm ${selected === c.id ? "border-amber-300/60 bg-amber-300/10" : "border-amber-100/15"}`}
                >
                  <span dir="auto" className="block break-words font-semibold">
                    {c.display_name}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/50">
                    <time dateTime={c.last_message_at}>
                      {new Date(c.last_message_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Cairo",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {hasUnread(c, "admin") && (
                      <span className="rounded-full bg-blue-400/15 px-2 py-1 text-blue-300">
                        Unread
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <p className="p-4 text-sm text-amber-100/50">No conversations found.</p>
              )}
            </div>
          </aside>
          <div className="fcds-theme min-w-0">
            {current && user ? (
              <SupportConversation key={current.id} userId={user.id} conversation={current} admin />
            ) : (
              <p className="rounded-2xl border border-amber-100/15 p-8 text-sm text-amber-100/50">
                Choose a conversation to read messages and reply.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
