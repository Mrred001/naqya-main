import { Languages } from "lucide-react";
import { useSitePreferences } from "./PreferencesProvider";

export function LanguageToggle() {
  const { language, toggleLanguage } = useSitePreferences();
  const nextLabel = language === "ar" ? "English" : "العربية";
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Languages size={16} aria-hidden="true" />
      <span>{nextLabel}</span>
    </button>
  );
}
