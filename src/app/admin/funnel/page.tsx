import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import Link from "next/link";

// signup_events has RLS enabled with an INSERT-only policy and no SELECT policy,
// so the cookie-bound session client reads zero rows here. Authorization for this
// page is the ADMIN_EMAIL check below; the reads go over the service role.
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FUNNEL_EVENTS = [
  "landing_viewed",
  "signup_started",
  "plan_selected",
  "checkout_opened",
  "card_entered",
  "trial_active",
] as const;

const EVENT_LABELS: Record<string, string> = {
  landing_viewed: "Landing Viewed",
  signup_started: "Signup Started",
  plan_selected: "Plan Selected",
  checkout_opened: "Checkout Opened",
  card_entered: "Card Entered",
  trial_active: "Trial Active",
};

type SearchParams = Promise<{ days?: string; plan?: string }>;

export default async function FunnelPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    redirect("/login");
  }

  const admin = getAdminSupabase();

  const params = await searchParams;
  const days = parseInt(params.days || "7", 10);
  const planFilter = params.plan || "";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Query counts per event
  const eventCounts: Record<string, number> = {};
  const planCounts: Record<string, Record<string, number>> = {};

  await Promise.all(
    FUNNEL_EVENTS.map(async (event) => {
      let query = admin
        .from("signup_events")
        .select("id, plan", { count: "exact" })
        .eq("event", event)
        .gte("created_at", since);

      if (planFilter) {
        query = query.eq("plan", planFilter);
      }

      const { count, data } = await query;
      eventCounts[event] = count ?? 0;

      // Aggregate by plan
      if (data) {
        planCounts[event] = {};
        for (const row of data) {
          const p = row.plan || "unknown";
          planCounts[event][p] = (planCounts[event][p] ?? 0) + 1;
        }
      }
    })
  );

  // Get distinct plans for filter
  const { data: planRows } = await admin
    .from("signup_events")
    .select("plan")
    .gte("created_at", since)
    .not("plan", "is", null);

  const allPlans = Array.from(new Set((planRows ?? []).map((r: { plan: string }) => r.plan).filter(Boolean)));

  // Build funnel rows with drop %
  const rows = FUNNEL_EVENTS.map((event, i) => {
    const count = eventCounts[event] ?? 0;
    const prevCount = i === 0 ? null : (eventCounts[FUNNEL_EVENTS[i - 1]] ?? 0);
    const dropPct =
      prevCount === null || prevCount === 0
        ? null
        : Math.round(((prevCount - count) / prevCount) * 100);
    return { event, count, dropPct, plans: planCounts[event] ?? {} };
  });

  const topCount = rows[0]?.count ?? 1;

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-sky-dark to-[#1565C0] text-white px-6 py-6"
        style={{ borderRadius: "0 0 24px 24px" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Signup Funnel</h1>
            <p className="text-white/80 text-sm mt-1">Conversion tracking</p>
          </div>
          <Link
            href="/admin"
            className="text-white/70 text-sm hover:text-white transition-colors"
          >
            &larr; Admin Hub
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Period:</span>
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/admin/funnel?days=${d}${planFilter ? `&plan=${planFilter}` : ""}`}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  days === d
                    ? "bg-sky-dark text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
          {allPlans.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">Plan:</span>
              <Link
                href={`/admin/funnel?days=${days}`}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  !planFilter
                    ? "bg-sky-dark text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                All
              </Link>
              {allPlans.map((p) => (
                <Link
                  key={p}
                  href={`/admin/funnel?days=${days}&plan=${p}`}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    planFilter === p
                      ? "bg-sky-dark text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Funnel table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 font-bold text-gray-700 dark:text-gray-200">Step</th>
                <th className="text-right px-5 py-3 font-bold text-gray-700 dark:text-gray-200">Count</th>
                <th className="text-right px-5 py-3 font-bold text-gray-700 dark:text-gray-200">Drop %</th>
                <th className="text-right px-5 py-3 font-bold text-gray-700 dark:text-gray-200">Conv %</th>
                <th className="px-5 py-3 font-bold text-gray-700 dark:text-gray-200">Bar</th>
                {!planFilter && allPlans.length > 0 && (
                  <th className="text-left px-5 py-3 font-bold text-gray-700 dark:text-gray-200">By Plan</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const convPct = topCount === 0 ? 0 : Math.round((row.count / topCount) * 100);
                const barWidth = topCount === 0 ? 0 : (row.count / topCount) * 100;
                return (
                  <tr
                    key={row.event}
                    className={`border-b border-gray-50 dark:border-gray-700/50 ${
                      i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-700/20"
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">
                      <span className="text-xs text-gray-400 mr-2">{i + 1}.</span>
                      {EVENT_LABELS[row.event] || row.event}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-gray-800 dark:text-gray-100">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.dropPct === null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={row.dropPct > 50 ? "text-red-500 font-bold" : row.dropPct > 25 ? "text-amber-500 font-semibold" : "text-green-600"}>
                          {row.dropPct > 0 ? `-${row.dropPct}%` : "0%"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                      {convPct}%
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-32">
                        <div
                          className="h-full bg-sky-dark rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                    {!planFilter && allPlans.length > 0 && (
                      <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {Object.entries(row.plans)
                          .map(([p, n]) => `${p}: ${n}`)
                          .join(" · ")}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Last {days} days · {rows[0]?.count ?? 0} sessions started
        </p>
      </div>
    </div>
  );
}
