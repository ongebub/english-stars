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
  const trialEnd = sub.trial_end || null;
  const isTrialing = sub.status === 'trialing';

  // Fetch students via SECURITY DEFINER function (bypasses RLS on profiles)
  const { data: tutorStudentRows } = await supabase
    .rpc("get_tutor_students", { p_tutor: user.id });

  const students = (tutorStudentRows || []).map((r: { student_user_id: string; display_name: string; first_name: string | null; last_name: string | null; avatar_emoji: string | null; joined_at: string; email: string | null }) => ({
    id: r.student_user_id,
    display_name: r.first_name && r.last_name
      ? `${r.first_name} ${r.last_name}`
      : r.display_name || r.email || "Student",
    avatar_emoji: r.avatar_emoji,
    created_at: r.joined_at,
    email: r.email,
  }));

  // Fetch invite codes (PK is `code`, not `id`)
  const { data: inviteCodes } = await supabase
    .from("tutor_invites")
    .select("code, created_at, revoked_at")
    .eq("tutor_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <TutorDashboardClient
      seatCount={seatCount}
      periodEnd={periodEnd}
      isTrialing={isTrialing}
      trialEnd={trialEnd}
      students={students || []}
      inviteCodes={
        (inviteCodes || []).map((c) => ({
          code: c.code,
          created_at: c.created_at,
          revoked: c.revoked_at !== null,
        }))
      }
    />
  );
}
