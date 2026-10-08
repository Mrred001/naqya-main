import { SavedItemsLink } from "@/components/account/SavedItemsLink";
import { AccountMenu } from "@/components/account/AccountMenu";
import { AdminLink } from "@/components/account/AdminLink";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { CommunityFooter } from "./CommunityFooter";
import { Link } from "@tanstack/react-router";
import { useSitePreferences } from "./PreferencesProvider";
import { Compass, Home } from "lucide-react";

export function NaqyaMark({ className = "h-6 w-6" }: { className?: string }) {
  // Several paths converge into one: abundance → curation → clarity
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 6 C 12 6, 14 16, 18 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M4 16 H18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M4 26 C 12 26, 14 16, 18 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path d="M18 16 H28" stroke="var(--primary)" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="28" cy="16" r="2" fill="var(--primary)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="NAQYA — نقيا">
      <img src="/naqya-logo-icon.svg" alt="" className="h-12 w-12 shrink-0" />{" "}
      <span className="text-lg font-semibold tracking-[0.18em]">NAQYA</span>
      <span className="text-lg font-medium text-muted-foreground" dir="rtl" lang="ar">
        نقيا
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { language } = useSitePreferences();
  const english = language === "en";
  return (
    <header className="glass sticky top-0 z-40 border-b" dir="ltr">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2 px-2 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center md:px-8">
        <div className="justify-self-end px-2 lg:col-start-3 lg:row-start-1 md:px-0">
          <Logo />
        </div>
        <nav
          aria-label={english ? "Main navigation" : "التنقل الرئيسي"}
          className="flex items-center justify-center gap-1 justify-self-center sm:gap-2 lg:col-start-2 lg:row-start-1"
          dir="ltr"
        >
          <AccountMenu iconOnly />
          <SavedItemsLink />
          <ThemeToggle />
          <LanguageToggle iconOnly />
          <AdminLink iconOnly />
          <Link
            to="/naqya"
            aria-label={english ? "Home" : "الرئيسية"}
            title={english ? "Home" : "الرئيسية"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-primary"
            activeProps={{ className: "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary bg-primary/10 text-primary" }}
          >
            <Home size={18} aria-hidden="true" />
          </Link>
          <Link
            to="/explore"
            aria-label={english ? "Explore" : "استكشف"}
            title={english ? "Explore" : "استكشف"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-primary"
            activeProps={{ className: "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary bg-primary/10 text-primary" }}
          >
            <Compass size={18} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <CommunityFooter />;
}
