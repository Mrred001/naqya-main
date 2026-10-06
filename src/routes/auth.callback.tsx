import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "تسجيل الدخول — نقيا" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallback,
});
function AuthCallback() {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    // getSession waits for Supabase's automatic PKCE exchange; never log auth URLs.
    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        // Only clean an actual OAuth query, and finish that navigation before
        // showing links the user can click. A same-route replace issued after
        // success can otherwise land after a link click and send them back here.
        if (window.location.search) {
          try {
            await navigate({ to: "/auth/callback", search: {}, replace: true });
          } catch {
            // Keep the callback usable if URL cleanup fails; Supabase has already
            // completed the session exchange.
          }
        }
        if (active) setState(!error && data.session ? "success" : "error");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [navigate]);
  return (
    <section className="mx-auto max-w-md space-y-5 px-5 py-24 text-center">
      <h1 className="text-3xl font-bold">
        {state === "loading"
          ? "جاري تسجيل دخولك…"
          : state === "success"
            ? "أهلاً بيك في نقيا"
            : "تسجيل الدخول ما اكتمل"}
      </h1>
      {state === "success" ? (
        <>
          <p>حسابك جاهز. احفظ المصادر البتهمك وارجع ليها من أي جهاز.</p>
          <Link
            to="/saved"
            className="inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground"
          >
            افتح المحفوظات
          </Link>
          <Link to="/naqya" className="block text-primary">
            تصفّح نقيا
          </Link>
          <Link to="/fcds" className="block text-primary">
            تصفّح الكلية
          </Link>
        </>
      ) : state === "error" ? (
        <>
          <p>ممكن تكون لغيت الدخول أو الرابط انتهت صلاحيته. تقدر تحاول تاني أو تواصل التصفّح.</p>
          <GoogleSignIn />
          <Link to="/" className="block text-primary">
            الرئيسية
          </Link>
        </>
      ) : (
        <p role="status">لحظات وبنجهّز حسابك.</p>
      )}
    </section>
  );
}
