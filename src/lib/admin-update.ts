import type { AdminTable } from "@/lib/admin-content";

/**
 * Client-side helper for admin content writes.
 *
 * Replaces direct `supabase.from(table).update(...)` calls in the review tools.
 * Those needed permissive RLS write policies that also let any signed-in user
 * mutate content; this routes through /api/admin/content instead, which checks
 * ADMIN_EMAIL server-side and writes with the service role.
 *
 * Returns `{ error }` with the same shape the supabase-js calls returned, so
 * existing optimistic-update rollback logic keeps working unchanged.
 */
export async function adminUpdate(
  table: AdminTable,
  filter: { column: string; value: string },
  patch: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  try {
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        filterColumn: filter.column,
        filterValue: filter.value,
        patch,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: { message: data.error || `HTTP ${res.status}` } };
    }
    return { error: null };
  } catch (err) {
    return {
      error: { message: err instanceof Error ? err.message : "Request failed" },
    };
  }
}
