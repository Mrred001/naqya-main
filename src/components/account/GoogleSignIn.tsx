import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function GoogleSignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signIn() {
    setBusy(true);
    setError(false);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "openid email profile",
        },
      });
      if (authError) throw authError;
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <GoogleMark />
        <span>{busy ? "جاري فتح قوقل…" : "المتابعة باستخدام Google"}</span>
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          ما قدرنا نبدأ تسجيل الدخول. جرّب تاني بعد شوية.
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
      />
      <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18Z" />
      <path
        fill="#EA4335"
        d="M24 11.9c3 0 5.6 1 7.7 3l5.8-5.8A19.3 19.3 0 0 0 24 4a20 20 0 0 0-18.2 11l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"
      />
    </svg>
  );
}
