import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("naqya-theme", next ? "dark" : "light");
    } catch {
      /* Storage may be disabled. */
    }
    setDark(next);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
