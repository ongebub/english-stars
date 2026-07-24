import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TutorDashboardClient from "./TutorDashboardClient";

export default async function TutorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check subscription — must be tutor/school tier
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!sub || (sub.plan_type !== "school" && sub.plan_type !== "tutor")) {
    redirect("/subscribe");
  }

  const seatCount = sub.max_students || sub.child_count || 5;
  const periodEnd = sub.current_period_end || null;

  // Fetch students linked to this tutor
  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_emoji, created_at")
    .eq("parent_id", user.id)
    .eq("role", "child")
    .order("created_at", { ascending: true });

  // Fetch invite codes
  const { data: inviteCodes } = await supabase
    .from("tutor_invites")
    .select("id, code, created_at, revoked")
    .eq("tutor_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TutorDashboardClient
      seatCount={seatCount}
      periodEnd={periodEnd}
      students={students || []}
      inviteCodes={
        (inviteCodes || []).map((c) => ({
          ...c,
          revoked: c.revoked ?? false,
        }))
      }
    />
  );
}
