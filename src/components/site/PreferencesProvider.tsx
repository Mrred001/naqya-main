import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/account/AccountProvider";

export type SiteLanguage = "ar" | "en";
export type SiteTheme = "dark" | "light";

type Preferences = {
  language: SiteLanguage;
  theme: SiteTheme;
  toggleLanguage: () => void;
  toggleTheme: () => void;
};

const PreferencesContext = createContext<Preferences>({
  language: "ar",
  theme: "dark",
  toggleLanguage: () => undefined,
  toggleTheme: () => undefined,
});

function storedValue<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return valid.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useSitePreferences = () => useContext(PreferencesContext);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount();
  const [language, setLanguage] = useState<SiteLanguage>(() =>
    storedValue("naqya-language", ["ar", "en"], "ar"),
  );
  const [theme, setTheme] = useState<SiteTheme>(() =>
    storedValue("naqya-theme", ["dark", "light"], "dark"),
  );

  const persist = useCallback(async (nextLanguage: SiteLanguage, nextTheme: SiteTheme) => {
    try {
      localStorage.setItem("naqya-language", nextLanguage);
      localStorage.setItem("naqya-theme", nextTheme);
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: { naqya_language: nextLanguage, naqya_theme: nextTheme },
        });
        if (error) console.warn("Could not save account display preferences.", error);
      } catch (error) {
        console.warn("Could not save account display preferences.", error);
      }
    }
  }, [user]);

  useEffect(() => {
    const metadata = user?.user_metadata ?? {};
    const savedLanguage = metadata["naqya_language"];
    const savedTheme = metadata["naqya_theme"];
    const nextLanguage: SiteLanguage = savedLanguage === "en" || savedLanguage === "ar"
      ? savedLanguage
      : language;
    const nextTheme: SiteTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : theme;
    setLanguage(nextLanguage);
    setTheme(nextTheme);
    try {
      localStorage.setItem("naqya-language", nextLanguage);
      localStorage.setItem("naqya-theme", nextTheme);
    } catch {
      // Preference state still applies even if storage is unavailable.
    }
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    if (user && (savedLanguage == null || savedTheme == null)) {
      void persist(nextLanguage, nextTheme);
    }
  // Account changes are the point at which preferences are restored.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language, theme]);

  const toggleLanguage = useCallback(() => {
    const next = language === "ar" ? "en" : "ar";
    setLanguage(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    void persist(next, theme);
  }, [language, persist, theme]);
  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    void persist(language, next);
  }, [language, persist, theme]);

  return (
    <PreferencesContext.Provider value={{ language, theme, toggleLanguage, toggleTheme }}>
      {children}
    </PreferencesContext.Provider>
  );
}
