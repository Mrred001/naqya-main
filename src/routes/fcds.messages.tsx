import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/components/account/AccountProvider";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { SupportConversation } from "@/components/chat/SupportConversation";
import { ownConversationQuery, supportAdminQuery } from "@/lib/support-chat";
export const Route = createFileRoute("/fcds/messages")({
  head: () => ({
    meta: [{ title: "محادثتك مع أحمد — درب" }, { name: "robots", content: "noindex" }],
  }),
  component: SupportChatPage,
});
function SupportChatPage() {
  const { user, ready } = useAccount();
  const { language } = useSitePreferences();
  const en = language === "en";
  const signedIn = user && !user.is_anonymous;
  const query = useQuery(ownConversationQuery(signedIn ? user.id : undefined));
  const role = useQuery(supportAdminQuery(signedIn ? user.id : undefined));
  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6" dir={en ? "ltr" : "rtl"}>
      <Link to="/fcds" className="text-sm text-primary">
        {en ? "Back to DARB" : "العودة إلى درب"}
      </Link>
      <h1 className="text-3xl font-bold">{en ? "Message Ahmed" : "راسل أحمد"}</h1>
      {!ready ? (
        <p role="status">{en ? "Checking your account…" : "جاري التحقق من حسابك…"}</p>
      ) : !signedIn ? (
        <div className="space-y-5 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold">
            {en ? "Sign in to start your private chat" : "سجّل دخول عشان تبدأ محادثتك الخاصة"}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {en
              ? "Your messages and Ahmed's replies stay in your account so you can return from any device."
              : "رسائلك وردود أحمد بتتحفظ في حسابك، وبتقدر ترجع ليها من أي جهاز."}
          </p>
          <GoogleSignIn intent="support-chat" />
        </div>
      ) : role.data ? (
        <div className="rounded-2xl border bg-card p-6">
          <p>
            {en
              ? "You are signed in as a curator. Open Chats in the admin dashboard to reply to students."
              : "إنت داخل بحساب الإدارة. افتح قسم Chats في الأدمن عشان ترد على الطلاب."}
          </p>
          <Link to="/admin" className="mt-4 inline-block text-primary underline">
            {en ? "Open admin dashboard" : "افتح لوحة الإدارة"}
          </Link>
        </div>
      ) : query.isPending || role.isPending ? (
        <p role="status">{en ? "Loading your conversation…" : "جاري تحميل محادثتك…"}</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{en ? "Could not load your conversation." : "ما قدرنا نحمّل محادثتك."}</p>
          <button onClick={() => void query.refetch()} className="min-h-11 text-primary underline">
            {en ? "Retry" : "حاول تاني"}
          </button>
        </div>
      ) : (
        <SupportConversation key={user.id} userId={user.id} conversation={query.data ?? null} />
      )}
    </section>
  );
}
