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
        className="w-full rounded-xl border bg-card px-4 py-3 font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {busy ? "جاري فتح قوقل…" : "المتابعة باستخدام Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          ما قدرنا نبدأ تسجيل الدخول. جرّب تاني بعد شوية.
        </p>
      )}
    </div>
  );
}
