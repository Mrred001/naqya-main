import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthReturn, getAuthReturn } from "@/lib/auth-return";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "تسجيل الدخول — نقيا" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallback,
});
function AuthCallback() {
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [destination, setDestination] = useState("/naqya");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const returnTo = getAuthReturn();
    setDestination(returnTo);
    // getSession waits for Supabase's automatic PKCE exchange; never log auth URLs.
    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error || !data.session || data.session.user.is_anonymous) {
          setState("error");
          return;
        }
        setState("success");
        // Replace the callback (and OAuth code) with the page that started login.
        // Wait for navigation before clearing state so effect retries retain it.
        await navigate({ href: returnTo, replace: true });
        clearAuthReturn();
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
            ? "تم تسجيل دخولك"
            : "تسجيل الدخول ما اكتمل"}
      </h1>
      {state === "success" ? (
        <>
          <p role="status">جاري رجوعك للصفحة…</p>
          <a href={destination} className="block text-primary">
            ارجع للصفحة
          </a>
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
