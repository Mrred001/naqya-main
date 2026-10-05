import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentCard } from "./ContentCard";
import type { ContentItem } from "@/lib/content";

export function WeeklyPicks({ items }: { items: ContentItem[] }) {
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
    <section className="py-12" aria-label="اختيارات هذا الأسبوع">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-primary">مختارات</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">اختيارات هذا الأسبوع</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="الاختيار السابق"
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
            aria-label="الاختيار التالي"
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
            <p className="mb-3 text-sm font-semibold text-primary">لماذا نرشحه؟</p>
            <p dir="auto" className="text-lg leading-loose text-muted-foreground">
              {selected.recommendation || "اختيار منتقى بعناية، يستحق وقتك."}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2" aria-label="اختر محتوى الأسبوع">
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
