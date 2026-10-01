import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Where to send someone straight after a successful login (no deep link asked for).
 *  - tutor plan        -> /tutor/dashboard (tutors have students, not child profiles)
 *  - parent with kids  -> /select-profile, so progress lands on the right child
 *                         rather than on whoever was last active on this device
 *  - anyone else       -> /learn
 * Any lookup failure falls back to /learn, the old behaviour.
 */
export async function postLoginPath(supabase: AnyClient): Promise<string> {
  try {
    const { data: sub } = await supabase.from("subscriptions").select("tier").single();
    if (sub?.tier === "tutor") return "/tutor/dashboard";
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "/learn";
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("role", "child")
      .is("deleted_at", null);
    return (count ?? 0) > 0 ? "/select-profile" : "/learn";
  } catch {
    return "/learn";
  }
}
