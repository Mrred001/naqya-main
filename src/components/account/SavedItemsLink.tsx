import { Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

export function SavedItemsLink() {
  const { language } = useSitePreferences();
  const label = language === "en" ? "Saved items" : "المحفوظات";
  return (
    <Link
      to="/saved"
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Bookmark size={18} aria-hidden="true" />
    </Link>
  );
}
