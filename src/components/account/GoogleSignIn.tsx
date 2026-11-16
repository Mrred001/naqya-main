import { useEffect, useRef, useState } from "react";
import { rememberAuthReturn, getAuthReturn, clearAuthReturn } from "@/lib/auth-return";
import { supabase } from "@/integrations/supabase/client";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
import { EmailOtpSignIn } from "./EmailOtpSignIn";

type GoogleIdentityClient = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        nonce: string;
        callback: (response: { credential?: string }) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type: string;
          theme: string;
          size: string;
          text: string;
          shape: string;
          width: number;
        },
      ) => void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleIdentityClient;
  }
}

async function generateNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return { raw, hashed };
}

export function GoogleSignIn({ intent }: { intent?: "support-chat" }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  // Public browser OAuth Client ID. When unset, the existing redirect flow remains available.
  const clientId = (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined)?.trim();
  // Keep the email method hidden until SMTP delivery and the OTP template are configured.
  const emailEnabled = import.meta.env["VITE_EMAIL_OTP_ENABLED"] === "true";
  const buttonRef = useRef<HTMLDivElement>(null);
  const [directReady, setDirectReady] = useState(false);
  const [directFailed, setDirectFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    let script: HTMLScriptElement | null = null;
    const url = "https://accounts.google.com/gsi/client";

    async function initialize() {
      try {
        const { raw, hashed } = await generateNonce();
        if (!active || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId!,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            if (!response.credential || !active) {
              if (active) setError(true);
              return;
            }
            void (async () => {
              setBusy(true);
              setError(false);
              try {
                rememberAuthReturn(intent);
                const { error: authError } = await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: response.credential!,
                  nonce: raw,
                });
                if (authError) throw authError;
                const destination = getAuthReturn();
                clearAuthReturn();
                window.location.assign(destination);
              } catch {
                if (active) setError(true);
              } finally {
                if (active) setBusy(false);
              }
            })();
          },
        });
        const parent = buttonRef.current;
        parent.replaceChildren();
        window.google.accounts.id.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.max(220, Math.min(380, parent.clientWidth || 320)),
        });
        if (active) setDirectReady(true);
      } catch {
        if (active) setDirectFailed(true);
      }
    }

    if (window.google) {
      void initialize();
    } else {
      script = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      if (!script) {
        script = document.createElement("script");
        script.src = url;
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
    }
    function onLoad() {
      void initialize();
    }
    function onError() {
      if (active) setDirectFailed(true);
    }
    return () => {
      active = false;
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [clientId, intent]);

  async function signIn() {
    setBusy(true);
    setError(false);
    try {
      rememberAuthReturn(intent);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
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
      {clientId && (
        <div
          ref={buttonRef}
          className={directReady ? "flex min-h-11 justify-center" : "hidden"}
          aria-label={english ? "Google sign-in" : "الدخول بقوقل"}
        />
      )}
      {!directReady || !clientId || directFailed ? (
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3 font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <GoogleMark />
          <span>
            {busy
              ? english
                ? "Opening Google…"
                : "جاري فتح قوقل…"
              : english
                ? "Continue with Google"
                : "المتابعة باستخدام Google"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void signIn()}
          className="block w-full text-center text-xs text-muted-foreground underline disabled:opacity-50"
        >
          {english
            ? "Having trouble? Use the alternative Google sign-in"
            : "الدخول المباشر ما اشتغل؟ جرّب طريقة قوقل البديلة"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {english
            ? "Could not complete sign-in. Please try Google again or use email."
            : "ما قدرنا نكمل الدخول. جرّب قوقل تاني أو استخدم الإيميل."}
        </p>
      )}
      {emailEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {english ? "or" : "أو"}
            <span className="h-px flex-1 bg-border" />
          </div>
          <EmailOtpSignIn intent={intent} />
        </>
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
