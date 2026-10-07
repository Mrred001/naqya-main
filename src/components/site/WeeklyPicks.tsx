import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentCard } from "./ContentCard";
import type { ContentItem } from "@/lib/content";
import { useSitePreferences } from "./PreferencesProvider";

export function WeeklyPicks({ items }: { items: ContentItem[] }) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const t = (ar: string, en: string) => (english ? en : ar);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const start = useRef<number | null>(null);
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );
  const selected = items[index];
  function move(delta: number) {
    const next = items[(index + delta + items.length) % items.length];
    if (next) setSelectedId(next.id);
  }
  if (!selected) return null;
  return (
    <section className="scroll-mt-28 py-10 md:py-12" aria-label={t("اختيارات هذا الأسبوع", "This week’s picks")}>
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-widest text-primary">{t("مختارات", "PICKS")}</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">{t("اختيارات هذا الأسبوع", "This week’s picks")}</h2>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            aria-label={t("الاختيار السابق", "Previous pick")}
            disabled={items.length < 2}
            onClick={() => move(-1)}
            className="pick-arrow"
          >
            <ChevronRight size={20} />
          </button>
          <span className="text-xs text-muted-foreground" dir="ltr">
            {index + 1} / {items.length}
          </span>
          <button
            type="button"
            aria-label={t("الاختيار التالي", "Next pick")}
            disabled={items.length < 2}
            onClick={() => move(1)}
            className="pick-arrow"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>
      <div
        className="weekly-panel grid gap-8 rounded-3xl border bg-card/50 p-4 md:p-7 lg:grid-cols-5"
        onTouchStart={(event) => {
          start.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          if (start.current !== null && touch) {
            const dx = touch.clientX - start.current;
            if (Math.abs(dx) > 60) move(dx > 0 ? 1 : -1);
          }
          start.current = null;
        }}
      >
        <div className="lg:col-span-3">
          <ContentCard key={selected.id} item={selected} size="lg" />
        </div>
        <div className="flex flex-col justify-center lg:col-span-2">
          <div key={selected.id} className="pick-description" aria-live="polite" aria-atomic="true">
            <p className="mb-3 text-sm font-semibold text-primary">{t("لماذا نرشحه؟", "Why we picked it")}</p>
            <p dir="auto" className="text-lg leading-loose text-muted-foreground">
              {selected.recommendation || t("اختيار منتقى بعناية، يستحق وقتك.", "Carefully selected, and worth your time.")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2" aria-label={t("اختر محتوى الأسبوع", "Choose a weekly pick")}>
            {items.map((item, i) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={i === index}
                className={`max-w-full rounded-xl border px-3 py-2 text-start text-sm transition-colors ${i === index ? "border-primary bg-primary-soft text-foreground" : "text-muted-foreground hover:border-primary/50"}`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
