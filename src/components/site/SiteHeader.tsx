import { AccountMenu } from "@/components/account/AccountMenu";
import { AdminLink } from "@/components/account/AdminLink";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { CommunityFooter } from "./CommunityFooter";
import { Link } from "@tanstack/react-router";
import { useSitePreferences } from "./PreferencesProvider";
import { Compass, Home, Menu } from "lucide-react";
import { useState } from "react";

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
  const [navOpen, setNavOpen] = useState(true);
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div dir="ltr" className="flex h-[4.25rem] items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? (english ? "Hide menu" : "إخفاء القائمة") : (english ? "Show menu" : "إظهار القائمة")}
            aria-expanded={navOpen}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-secondary md:hidden"
          >
            <Menu size={22} />
          </button>
          <div className="flex min-w-0 flex-1 justify-center md:flex-none md:justify-start">
            <Logo />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AccountMenu />
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label={english ? "Main navigation" : "التنقل الرئيسي"}
          dir="rtl"
          className={`${navOpen ? "flex" : "hidden"} min-h-12 flex-wrap items-center justify-center gap-2 border-t border-border/70 py-2 md:absolute md:start-1/2 md:top-1/2 md:min-h-0 md:-translate-x-1/2 md:-translate-y-1/2 md:gap-3 md:border-0 md:py-0`}
        >
          <Link
            to="/naqya"
            className="nav-link"
            activeProps={{ className: "nav-link nav-link-active" }}
          >
            <Home size={18} aria-hidden="true" />
            {english ? "Home" : "الرئيسية"}
          </Link>
          <Link
            to="/explore"
            className="nav-link"
            activeProps={{ className: "nav-link nav-link-active" }}
          >
            <Compass size={18} aria-hidden="true" />
            {english ? "Explore" : "استكشف"}
          </Link>
          <LanguageToggle />
          <AdminLink />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <CommunityFooter />;
}
