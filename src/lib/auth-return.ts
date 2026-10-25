const RETURN_KEY = "naqya-auth-return";
const INTENT_KEY = "naqya-auth-intent";

// Accept local destinations only; never return into the OAuth callback itself.
export function safeAuthReturnPath(value: string | null): string | null {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some((character) => character.charCodeAt(0) <= 32)
  )
    return null;
  try {
    const url = new URL(value, "https://naqya.local");
    if (url.origin !== "https://naqya.local" || /^\/auth(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function rememberAuthReturn(intent?: "support-chat") {
  try {
    // A failed callback retry must retain the original destination.
    if (window.location.pathname === "/auth/callback") return;
    const destination =
      intent === "support-chat"
        ? "/fcds/messages"
        : safeAuthReturnPath(
            `${window.location.pathname}${window.location.search}${window.location.hash}`,
          );
    if (destination) sessionStorage.setItem(RETURN_KEY, destination);
    else sessionStorage.removeItem(RETURN_KEY);
    if (intent) sessionStorage.setItem(INTENT_KEY, intent);
    else sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // Storage restrictions must not prevent Google sign-in.
  }
}

export function getAuthReturn(): string {
  try {
    return (
      safeAuthReturnPath(sessionStorage.getItem(RETURN_KEY)) ??
      (sessionStorage.getItem(INTENT_KEY) === "support-chat" ? "/fcds/messages" : "/naqya")
    );
  } catch {
    return "/naqya";
  }
}

export function clearAuthReturn() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // Optional navigation state only.
  }
}
