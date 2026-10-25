import { useQuery } from "@tanstack/react-query";
import { darbStatsQuery } from "@/lib/darb-public-stats";
import { useSitePreferences } from "@/components/site/PreferencesProvider";
export function DarbStats() {
  const en = useSitePreferences().language === "en";
  const query = useQuery(darbStatsQuery);
  const data = query.data;
  const format = (value: number | undefined) =>
    value === undefined ? "—" : new Intl.NumberFormat(en ? "en" : "ar-EG").format(value);
  return (
    <div className="mt-7 space-y-2" dir={en ? "ltr" : "rtl"}>
      <dl
        aria-label={en ? "Darb statistics" : "إحصائيات درب"}
        className="grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-4"
      >
        {[
          [en ? "Playlists" : "بلاي ليست", data?.playlists],
          [en ? "Videos" : "فيديو", data?.videos],
          [en ? "Recorded site visits" : "زيارات الموقع المسجّلة", data?.visits],
        ].map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl border border-primary/15 bg-primary/[0.04] px-2 py-4 text-center sm:px-4"
          >
            <dd className="text-2xl font-bold tabular-nums text-primary sm:text-3xl">
              {format(value as number | undefined)}
            </dd>
            <dt className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {label}
            </dt>
          </div>
        ))}
      </dl>
      {query.isError ? (
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="text-xs text-muted-foreground underline"
        >
          {en ? "Statistics unavailable · retry" : "الإحصائيات غير متاحة · إعادة المحاولة"}
        </button>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {en
            ? "Unique Darb links; playlists exclude their individual videos. Visits cover both libraries, once per browser per day"
            : "روابط درب بدون تكرار؛ فيديوهات البلاي ليست ما محسوبة كفيديوهات منفردة. الزيارات للموقع كله، مرة للمتصفح يومياً"}
          {data?.tracked_since
            ? ` · ${en ? "recorded since" : "التسجيل من"} ${new Date(data.tracked_since).toLocaleDateString(en ? "en-GB" : "ar-EG", { timeZone: "Africa/Cairo" })}`
            : ""}
          .
        </p>
      )}
    </div>
  );
}
