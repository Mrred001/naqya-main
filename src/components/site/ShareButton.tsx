import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { trackAnalytics } from "@/lib/analytics";
import { useSitePreferences } from "./PreferencesProvider";

export function ShareButton({
  library,
  resourceId,
  courseSlug,
  title,
}: {
  library: "general" | "fcds";
  resourceId?: string;
  courseSlug?: string;
  title: string;
}) {
  const { language } = useSitePreferences();
  const english = language === "en";
  const share = async () => {
    const path =
      library === "general" && resourceId
        ? `/watch/${resourceId}`
        : library === "fcds" && resourceId
          ? `/fcds/resource/${resourceId}`
          : courseSlug
            ? `/fcds/course/${courseSlug}`
            : window.location.pathname;
    const url = new URL(path, window.location.origin);
    url.searchParams.set("utm_source", "share");
    try {
      if (navigator.share) await navigator.share({ title, url: url.href });
      else {
        await navigator.clipboard.writeText(url.href);
        toast.success(english ? "Link copied" : "تم نسخ الرابط");
      }
      void trackAnalytics("share", library, {
        ...(resourceId ? { resourceId } : {}),
        ...(courseSlug ? { courseSlug } : {}),
      });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        toast.error(english ? "Could not share the link" : "ما قدرنا نشارك الرابط");
    }
  };
  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Share2 size={16} aria-hidden="true" />
      {english ? "Share" : "مشاركة"}
    </button>
  );
}
