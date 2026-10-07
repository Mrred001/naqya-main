import { Moon, Sun } from "lucide-react";
import { useSitePreferences } from "./PreferencesProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, language } = useSitePreferences();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark
        ? language === "ar" ? "تفعيل الوضع الفاتح" : "Switch to light mode"
        : language === "ar" ? "تفعيل الوضع الداكن" : "Switch to dark mode"}
      title={dark
        ? language === "ar" ? "الوضع الفاتح" : "Light mode"
        : language === "ar" ? "الوضع الداكن" : "Dark mode"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
