import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, AlertCircle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { percent, periodChange, type AnalyticsSummary } from "@/lib/analytics-dashboard";

const panel = "rounded-2xl border border-amber-100/10 bg-amber-100/[0.025] p-5 sm:p-6";
const select =
  "min-h-11 rounded-xl border border-amber-200/20 bg-[#19160f] px-3 py-2 text-sm text-amber-50 outline-none focus:ring-2 focus:ring-amber-300/40";
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className={panel}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs leading-relaxed text-amber-50/45">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Empty({
  children = "No activity recorded for this period yet.",
}: {
  children?: ReactNode;
}) {
  return <p className="py-3 text-sm leading-relaxed text-amber-50/45">{children}</p>;
}
export function AnalyticsDashboard() {
  const [days, setDays] = useState(7);
  const [library, setLibrary] = useState("all");
  const query = useQuery({
    queryKey: ["admin-analytics", days, library],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_site_analytics", {
        p_days: days,
        p_library: library,
      });
      if (error) throw error;
      return data as unknown as AnalyticsSummary;
    },
  });
  const legacy = useQuery({
    queryKey: ["admin-daily-visits", 7],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_site_visits", { days: 7 });
      if (error) throw error;
      return data;
    },
  });
  const data = query.data;
  const current = data?.current ?? {};
  const previous = data?.previous ?? {};
  const visitors = Number(current.visitors ?? 0);
  const opened = percent(Number(current.open_visitors ?? 0), visitors);
  const previousOpened = percent(
    Number(previous.open_visitors ?? 0),
    Number(previous.visitors ?? 0),
  );
  const cards = [
    {
      label: "Visitors",
      value: visitors.toLocaleString(),
      note: `${current.sessions ?? 0} sessions · ${Math.max(0, visitors - Number(current.returning ?? 0))} new browsers`,
      change: periodChange(visitors, Number(previous.visitors ?? 0)),
    },
    {
      label: "Source opens",
      value: Number(current.opens ?? 0).toLocaleString(),
      note: "Resource pages in NAQYA · YouTube clicks in DARB",
      change: periodChange(Number(current.opens ?? 0), Number(previous.opens ?? 0)),
    },
    {
      label: "Opened a source",
      value: opened === null ? "—" : `${opened}%`,
      note: `${current.open_visitors ?? 0} of ${visitors} visitors`,
      change:
        opened !== null && previousOpened !== null
          ? `${opened - previousOpened > 0 ? "+" : ""}${opened - previousOpened} percentage points`
          : "Collecting a comparison baseline",
    },
    {
      label: "Returning visitors",
      value: Number(current.returning ?? 0).toLocaleString(),
      note: "Browsers first seen before this period",
      change: periodChange(Number(current.returning ?? 0), Number(previous.returning ?? 0)),
    },
    {
      label: "Pending suggestions",
      value: String(data?.pending ?? 0),
      note: "Current review queue · not a period total",
      change: "Ready for your review",
    },
  ];
  const peak = Math.max(1, ...(data?.daily ?? []).map((d) => Number(d.visitors)));
  return (
    <div className="mt-7 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-amber-50/40">USAGE & REACH</p>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-5 w-5 text-amber-300" />
            Analytics
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Analytics library"
            className={select}
            value={library}
            onChange={(e) => setLibrary(e.target.value)}
          >
            <option value="all">All libraries</option>
            <option value="general">NAQYA</option>
            <option value="fcds">DARB</option>
          </select>
          <select
            aria-label="Analytics period"
            className={select}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            type="button"
            aria-label="Refresh analytics"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            className="min-h-11 rounded-xl border border-amber-200/20 p-3 text-amber-200 disabled:opacity-40"
          >
            <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-amber-50/45">
        Khartoum time · Today is incomplete. Visitors are estimated by browser, not verified people.
        Sessions restart after 30 minutes of inactivity. Opens do not prove a video was watched.
        Signed-in curators are excluded.
      </p>
      {query.isError ? (
        <div role="alert" className={panel}>
          <p className="text-red-300">Could not load analytics. Your content is unaffected.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 text-sm text-amber-200 underline"
          >
            Try again
          </button>
        </div>
      ) : query.isPending ? (
        <p role="status" className="py-8 text-amber-50/50">
          Loading analytics…
        </p>
      ) : (
        data && (
          <>
            <div className="rounded-xl border border-amber-200/15 bg-amber-300/[0.04] px-4 py-3 text-xs leading-relaxed text-amber-100/60">
              Detailed tracking started{" "}
              {new Date(data.tracked_since).toLocaleString("en-GB", {
                timeZone: "Africa/Khartoum",
              })}
              . Earlier traffic remains in the legacy history below. Library splits, engagement,
              retention, and comparisons use only the new tracking; initial periods are partial.
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {cards.map((card) => (
                <div key={card.label} className={panel}>
                  <p className="text-xs text-amber-50/55">{card.label}</p>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-amber-100">
                    {card.value}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-amber-200/75">{card.change}</p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-50/40">{card.note}</p>
                </div>
              ))}
            </div>
            <Section
              title="Daily visitors"
              subtitle="Distinct browsers each day; the same browser can appear on multiple days."
            >
              <div className="overflow-x-auto pb-2">
                <div
                  className="flex items-end gap-2"
                  style={{ minWidth: days > 7 ? days * 32 : undefined }}
                >
                  {data.daily.map((day) => (
                    <div key={day.day} className="min-w-0 flex-1 text-center">
                      <span className="text-[11px] tabular-nums text-amber-100/70">
                        {day.visitors}
                      </span>
                      <div className="mt-2 flex h-28 items-end rounded-lg bg-black/20">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-200"
                          style={{ height: `${(Number(day.visitors) / peak) * 100}%` }}
                        />
                      </div>
                      <span className="mt-2 block text-[10px] text-amber-50/45">
                        {day.day.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
            <div className="grid gap-5 lg:grid-cols-2">
              <Section
                title="Actions & return visits"
                subtitle="Saves and shares count successful actions, not video completion."
              >
                <dl className="grid grid-cols-2 gap-4">
                  {[
                    ["Saved", current.saves ?? 0],
                    ["Shared / copied", current.shares ?? 0],
                    ["Searches", current.searches ?? 0],
                    ["Searches with no results", current.no_results ?? 0],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-amber-50/50">{label}</dt>
                      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 border-t border-amber-100/10 pt-4">
                  <p className="text-sm">
                    Returned within 7 days:{" "}
                    <strong className="text-amber-200">
                      {data.retention.eligible
                        ? `${percent(data.retention.returned, data.retention.eligible)}%`
                        : "Collecting data"}
                    </strong>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-50/45">
                    {data.retention.returned} of {data.retention.eligible} eligible new browsers
                    returned on a later day within 7 days. Only cohorts with a full 7-day
                    observation window count.
                  </p>
                </div>
              </Section>
              <Section
                title="Traffic sources"
                subtitle="Attributed to the session entry link. Direct / unknown includes apps that hide referrers."
              >
                {data.sources.length ? (
                  <div className="space-y-3">
                    {data.sources.map((row) => (
                      <div
                        key={row.source}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 break-words">
                          {row.source === "direct" ? "Direct / unknown" : row.source}
                        </span>
                        <span className="shrink-0 text-amber-100/60">
                          {row.sessions} sessions · {row.visitors} visitors
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
                <p className="mt-5 text-xs leading-relaxed text-amber-50/45">
                  For campaign attribution, add{" "}
                  <code className="break-all">?utm_source=whatsapp&amp;utm_campaign=materials</code>{" "}
                  to links you publish.
                </p>
              </Section>
            </div>
            <Section
              title="Most used resources"
              subtitle="NAQYA counts resource-page opens; DARB counts intentional YouTube link opens. Repeats are deduplicated within 30-minute buckets."
            >
              {data.resources.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-xs text-amber-50/45">
                      <tr>
                        <th className="pb-3 font-normal">Resource</th>
                        <th className="pb-3 font-normal">Opens</th>
                        <th className="pb-3 font-normal">Saves</th>
                        <th className="pb-3 font-normal">Shares</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.resources.map((row) => (
                        <tr key={row.resource_id} className="border-t border-amber-100/10">
                          <td className="max-w-xs py-3 pr-4">
                            <p dir="auto" className="line-clamp-2">
                              {row.title}
                            </p>
                            <span className="text-[11px] text-amber-50/40">
                              {row.library === "fcds" ? "DARB" : "NAQYA"}
                            </span>
                          </td>
                          <td>{row.opens}</td>
                          <td>{row.saves}</td>
                          <td>{row.shares}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
            </Section>
            {library !== "general" && (
              <Section
                title="Popular courses"
                subtitle="Course page views and intentional source opens."
              >
                {data.courses.length ? (
                  <div className="space-y-3">
                    {data.courses.map((row) => (
                      <div
                        key={row.slug}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100/10 pb-3 text-sm"
                      >
                        <a
                          href={`/fcds/course/${row.slug}`}
                          className="inline-flex items-center gap-1 text-amber-100 hover:underline"
                        >
                          {row.name}
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                        <span className="text-xs text-amber-50/50">
                          {row.views} views · {row.opens} opens
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </Section>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <Section
                title="Search demand"
                subtitle="Searches are recorded after typing pauses, with repeated terms deduplicated. Email addresses and pasted links are excluded."
              >
                {data.searches.length ? (
                  <div className="space-y-3">
                    {data.searches.map((row) => (
                      <div key={row.term} className="flex justify-between gap-3 text-sm">
                        <span dir="auto" className="min-w-0 break-words">
                          {row.term}
                        </span>
                        <span className="shrink-0 text-xs text-amber-50/50">
                          {row.searches} searches · {row.no_results} empty
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </Section>
              <Section
                title="Needs your attention"
                subtitle="Use these signals to decide what to add or review next."
              >
                <div className="flex items-center gap-2 text-sm text-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  {data.pending} pending suggestions · {data.reports} open reports
                </div>
                <p className="mt-4 text-xs uppercase tracking-wider text-amber-50/45">
                  Searches with no results
                </p>
                {data.missed_searches.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.missed_searches.map((row) => (
                      <li key={row.term} className="flex justify-between gap-3">
                        <span dir="auto" className="break-words">
                          {row.term}
                        </span>
                        <span className="text-amber-50/50">{row.searches}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>No unsuccessful searches recorded yet.</Empty>
                )}
              </Section>
            </div>
            {data.coverage && (
              <Section
                title="DARB content coverage"
                subtitle="Current library totals, independent of the selected reporting period."
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <strong className="text-3xl text-amber-200">
                    {data.coverage.covered} / {data.coverage.total}
                  </strong>
                  <span className="text-sm text-amber-50/55">
                    courses have resources ·{" "}
                    {percent(data.coverage.covered, data.coverage.total) ?? 0}% covered
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
                  <div
                    className="h-full bg-amber-300"
                    style={{
                      width: `${percent(data.coverage.covered, data.coverage.total) ?? 0}%`,
                    }}
                  />
                </div>
                <p className="mt-5 text-xs text-amber-50/50">
                  Courses without resources (up to 10):
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <p className="mb-3 text-xs text-amber-100/50">
                    {data.coverage.unique_resources ?? "—"} unique resources ·{" "}
                    {data.coverage.associations ?? "—"} course links ·{" "}
                    {data.coverage.support_only ?? "—"} support-only courses. Coverage counts course
                    sources only.
                  </p>
                  {data.coverage.missing.map((row) => (
                    <span
                      key={row.slug}
                      className="rounded-lg border border-amber-100/10 px-3 py-2 text-xs text-amber-100/65"
                    >
                      {row.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            <Section
              title="Campaign links"
              subtitle="Sessions attributed using utm_source and utm_campaign."
            >
              {data.campaigns.length ? (
                <div className="space-y-3">
                  {data.campaigns.map((row) => (
                    <div
                      key={`${row.campaign}:${row.source}`}
                      className="flex flex-wrap justify-between gap-2 text-sm"
                    >
                      <span className="break-words">
                        {row.campaign} <span className="text-amber-50/40">· {row.source}</span>
                      </span>
                      <span className="text-amber-100/60">{row.sessions} sessions</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>No tagged campaigns recorded yet.</Empty>
              )}
            </Section>
          </>
        )
      )}
      <details className={panel}>
        <summary className="cursor-pointer text-sm font-medium text-amber-100/70">
          Legacy daily traffic · today {legacy.data?.at(-1)?.total ?? "—"}
        </summary>
        <p className="mt-3 text-xs leading-relaxed text-amber-50/45">
          Historical counts are preserved. The earlier tracker used a different key each day, so
          these cannot establish returning visitors, library splits, or unique visitors across
          multiple days.
        </p>
        {legacy.isError ? (
          <Empty>Historical daily traffic could not be loaded.</Empty>
        ) : legacy.isPending ? (
          <Empty>Loading history…</Empty>
        ) : (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {legacy.data.map((row) => (
              <div key={row.visit_date} className="rounded-lg bg-black/20 p-2 text-center">
                <p className="text-lg font-semibold text-amber-200">{row.total}</p>
                <p className="mt-1 text-[10px] text-amber-50/45">{row.visit_date.slice(5)}</p>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
