import { Link } from "@tanstack/react-router";

export function NaqyaMark({ className = "h-6 w-6" }: { className?: string }) {
  // Several paths converge into one: abundance → curation → clarity
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M4 6 C 12 6, 14 16, 18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M4 16 H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M4 26 C 12 26, 14 16, 18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M18 16 H28" stroke="var(--primary)" strokeWidth="2.75" strokeLinecap="round" />
      <circle cx="28" cy="16" r="2" fill="var(--primary)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="NAQYA — نقيا">
<img
  src="/naqya-logo-icon.svg"
  alt=""
  className="h-12 w-12 shrink-0"
/>      <span className="text-lg font-semibold tracking-[0.18em]">NAQYA</span>
      <span className="text-lg font-medium text-muted-foreground" dir="rtl" lang="ar">نقيا</span>
    </Link>
  );
}

export function SiteHeader() {
  const link = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-6">
          <Link to="/" className={link} activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>الرئيسية</Link>
          <Link to="/explore" className={link} activeProps={{ className: "text-foreground" }}>استكشف</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:px-8">
        <p dir="rtl" lang="ar" className="text-base text-foreground">نقيا — ما يستحق وقتك.</p>
        <div className="flex items-center gap-4">
          <span>Curated by Ahmed Osama</span>
          <Link to="/admin" className="text-xs opacity-50 hover:opacity-100">·</Link>
        </div>
      </div>
    </footer>
  );
}
