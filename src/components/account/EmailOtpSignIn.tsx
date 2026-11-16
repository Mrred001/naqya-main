import { useState, type FormEvent } from "react";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { rememberAuthReturn, getAuthReturn, clearAuthReturn } from "@/lib/auth-return";
import { supabase } from "@/integrations/supabase/client";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

export function EmailOtpSignIn({ intent }: { intent?: "support-chat" }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      rememberAuthReturn(intent);
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (authError) throw authError;
      setStep("verify");
    } catch {
      setError(t(
        "ما قدرنا نرسل الرسالة. جرّب لاحقاً أو استخدم Google. ممكن يكون إرسال البريد غير مفعّل حالياً.",
        "We couldn't send the email. Try again later or use Google. Email delivery may not be configured yet.",
      ));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: "email",
      });
      if (authError) throw authError;
      const destination = getAuthReturn();
      clearAuthReturn();
      window.location.assign(destination);
    } catch {
      setError(t("الرمز غير صحيح أو انتهت صلاحيته. جرّب تاني.", "Invalid or expired code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Mail className="h-5 w-5" aria-hidden="true" />
          {t("المتابعة بالإيميل", "Continue with email")}
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border p-4">
          {step === "email" ? (
            <form className="space-y-3" onSubmit={sendCode}>
              <label className="block text-sm font-semibold" htmlFor="naqya-login-email">
                {t("إيميلك", "Your email")}
              </label>
              <input
                id="naqya-login-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                className="w-full rounded-lg border bg-background px-3 py-2 text-foreground"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? t("جاري الإرسال…", "Sending…") : t("أرسل رمز الدخول", "Send sign-in code")}
              </button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={verifyCode}>
              <p className="text-sm text-muted-foreground">
                {t("راجع بريدك: ", "Check your inbox: ")}<span dir="ltr">{email}</span>
              </p>
              <label className="block text-sm font-semibold" htmlFor="naqya-login-token">
                {t("رمز التحقق", "Verification code")}
              </label>
              <input
                id="naqya-login-token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,8}"
                maxLength={8}
                required
                value={token}
                onChange={(event) => setToken(event.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                dir="ltr"
                className="w-full rounded-lg border bg-background px-3 py-2 text-center tracking-widest text-foreground"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? t("جاري التحقق…", "Verifying…") : t("تأكيد الرمز والدخول", "Verify and sign in")}
              </button>
              <p className="text-xs text-muted-foreground">
                {t(
                  "لو وصلك رابط دخول بدل الرمز، افتح الرابط من الإيميل. ممكن الرسالة تصل في Spam.",
                  "If your email contains a sign-in link instead of a code, open that link. Check spam too.",
                )}
              </p>
              <button
                type="button"
                onClick={() => { setStep("email"); setToken(""); setError(""); }}
                className="flex items-center gap-1 text-sm text-primary underline"
              >
                {english ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {t("غيّر الإيميل أو أعد الإرسال", "Change email or resend")}
              </button>
            </form>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => { setExpanded(false); setError(""); }}
          >
            {t("إغلاق", "Close")}
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
