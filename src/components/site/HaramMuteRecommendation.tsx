import { ExternalLink } from "lucide-react";
import { useSitePreferences } from "@/components/site/PreferencesProvider";

const HARAMMUTE_AR = "https://haram-mute.com/ar/";
const HARAMMUTE_ANDROID = "https://play.google.com/store/apps/details?id=com.harammute.mobile";

export function HaramMuteRecommendation() {
  const { language } = useSitePreferences();
  const english = language === "en";

  return (
    <section className="mt-6 rounded-2xl border border-primary/20 bg-primary-soft p-5 md:p-6">
      <h2 className="text-lg font-semibold">
        {english ? "Want to reduce background music?" : "عايز تقلل موسيقى الخلفية؟"}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {english
          ? "HaramMute is an external service for supported YouTube videos. Its site explains how to use the browser extension or mobile app. Audio separation results vary by video. Try the available free use first; if it helps and you need more time, review its current paid plans in the app."
          : "HaramMute خدمة خارجية للفيديوهات المدعومة على YouTube. موقعهم بشرح طريقة استخدام إضافة المتصفح أو تطبيق الجوال. نتيجة عزل الموسيقى بتختلف من فيديو للتاني. جرّب الاستخدام المجاني المتاح؛ ولو الخدمة نفعتك واحتجت استخداماً أطول، راجع خطط الاشتراك الحالية داخل التطبيق."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={HARAMMUTE_AR} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          {english ? "How it works" : "طريقة الاستخدام والاشتراك"}<ExternalLink className="h-4 w-4" />
        </a>
        <a href={HARAMMUTE_ANDROID} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm">
          {english ? "Android app" : "تطبيق أندرويد"}<ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
