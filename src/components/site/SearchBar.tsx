import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "./PreferencesProvider";

export function SearchBar({ initial = "", onChange, className }: { initial?: string; onChange?: (q: string) => void; className?: string }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!onChange) navigate({ to: "/explore", search: { q } });
      }}
      className={cn("group flex items-center gap-3 rounded-full border bg-card/70 px-5 py-3.5 transition-all focus-within:border-primary/50 focus-within:bg-card", className)}
    >
      <Search className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder={english ? "Search videos, playlists, channels, or topics…" : "ابحث عن فيديو، قائمة تشغيل، قناة، أو موضوع..."} aria-label={english ? "Search" : "بحث"}
        className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}
