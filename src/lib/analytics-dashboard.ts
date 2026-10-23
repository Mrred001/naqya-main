export type Metrics = {
  visitors: number;
  sessions: number;
  opens: number;
  open_visitors: number;
  saves: number;
  shares: number;
  searches: number;
  no_results: number;
  returning: number;
};
export type AnalyticsSummary = {
  tracked_since: string;
  current: Partial<Metrics>;
  previous: Partial<Metrics>;
  daily: { day: string; visitors: number; opens: number }[];
  resources: {
    library: string;
    resource_id: string;
    title: string;
    opens: number;
    saves: number;
    shares: number;
  }[];
  courses: { name: string; slug: string; views: number; opens: number }[];
  searches: { term: string; searches: number; no_results: number }[];
  missed_searches: { term: string; searches: number }[];
  sources: { source: string; sessions: number; visitors: number }[];
  campaigns: { source: string; campaign: string; sessions: number; visitors: number }[];
  retention: { eligible: number; returned: number };
  coverage: { total: number; covered: number; missing: { name: string; slug: string }[] } | null;
  pending: number;
  reports: number;
};
export function percent(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}
export function periodChange(current: number, previous: number): string {
  if (!previous) return current ? "New activity · no baseline" : "No change";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}% vs previous period`;
}
