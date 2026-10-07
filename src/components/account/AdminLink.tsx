import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAccount } from "./AccountProvider";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

const ADMIN_EMAIL = "ahmed13redmx@gmail.com";

export function AdminLink() {
  const { user, ready } = useAccount();
  const { language } = useSitePreferences();
  const isAdminAccount = user?.email?.trim().toLowerCase() === ADMIN_EMAIL;

  if (!ready || !isAdminAccount) return null;

  return (
    <Link
      to="/admin"
      className="group relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 px-3.5 py-2 text-xs font-extrabold text-zinc-950 shadow-md shadow-amber-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4 sm:text-sm"
      aria-label={language === "en" ? "Admin dashboard" : "لوحة الإدارة"}
    >
      <Sparkles
        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-12"
        aria-hidden="true"
      />
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      <span>{language === "en" ? "Admin" : "الإدارة"}</span>
    </Link>
  );
}
