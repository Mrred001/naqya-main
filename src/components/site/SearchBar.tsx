import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "./PreferencesProvider";

export function SearchBar({ initial = "", onChange, className }: { initial?: string; onChange?: (q: string) => void; className?: string }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const [q, setQ] = useState(initial);
  const [expanded, setExpanded] = useState(Boolean(initial));
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  return (
    <div
      className={cn(
        "relative h-12 transition-[width] duration-300 ease-out",
        expanded ? "w-full" : "w-12",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={english ? "Open search" : "افتح البحث"}
        aria-expanded={expanded}
        className={cn(
          "absolute inset-0 grid h-12 w-12 place-items-center rounded-full border bg-card/80 text-foreground transition-opacity duration-200 hover:border-primary hover:text-primary",
          expanded ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!onChange) navigate({ to: "/explore", search: { q } });
        }}
        aria-hidden={!expanded}
        className={cn(
          "group absolute inset-0 flex h-12 items-center gap-3 rounded-full border bg-card/80 px-4 transition-opacity duration-200 focus-within:border-primary/50 focus-within:bg-card",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
        <input
          ref={inputRef}
          disabled={!expanded}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange?.(e.target.value);
          }}
          placeholder={english ? "Search videos, playlists, channels, or topics…" : "ابحث عن فيديو، قائمة تشغيل، قناة، أو موضوع..."}
          aria-label={english ? "Search" : "بحث"}
          className="min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => {
            setQ("");
            onChange?.("");
            setExpanded(false);
          }}
          disabled={!expanded}
          aria-label={english ? "Close search" : "إغلاق البحث"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
