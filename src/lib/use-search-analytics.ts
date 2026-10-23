import { useEffect } from "react";
import { trackAnalytics, type AnalyticsLibrary } from "./analytics";
export function useSearchAnalytics(
  library: AnalyticsLibrary,
  term: string,
  results: number,
  ready = true,
) {
  useEffect(() => {
    if (!ready || term.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void trackAnalytics("search", library, { term, results });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [library, term, results, ready]);
}
