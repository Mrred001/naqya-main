import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useAccount } from "@/components/account/AccountProvider";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { ownConversationQuery, hasUnread } from "@/lib/support-chat";
export function SupportChatButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { user } = useAccount();
  const { language } = useSitePreferences();
  const en = language === "en";
  const query = useQuery({
    ...ownConversationQuery(user && !user.is_anonymous ? user.id : undefined),
    refetchInterval: 15000,
  });
  const unread = query.data && hasUnread(query.data, "user");
  const label = en ? "Message Ahmed" : "راسل أحمد";
  return (
    <Link
      to="/fcds/messages"
      aria-label={unread ? `${label} · ${en ? "Unread reply" : "رد جديد"}` : label}
      title={label}
      className={`relative inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-blue-400 ${iconOnly ? "h-10 w-10" : "px-4 py-2 text-sm"}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {!iconOnly && label}
      {unread && (
        <span
          aria-hidden="true"
          className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-blue-500"
        />
      )}
    </Link>
  );
}
