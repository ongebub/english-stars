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

  // Fetch students linked to this tutor via tutor_students join table
  const { data: tutorStudentRows } = await supabase
    .from("tutor_students")
    .select("student_user_id, joined_at")
    .eq("tutor_user_id", user.id)
    .is("removed_at", null)
    .order("joined_at", { ascending: true });

  // Fetch profile details for each student
  let students: { id: string; display_name: string; avatar_emoji: string | null; created_at: string }[] = [];
  if (tutorStudentRows && tutorStudentRows.length > 0) {
    const studentIds = tutorStudentRows.map((r) => r.student_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_emoji, created_at")
      .in("id", studentIds);
    students = (profiles || []).map((p) => ({
      ...p,
      // Use joined_at from tutor_students as the relevant date
      created_at: tutorStudentRows.find((r) => r.student_user_id === p.id)?.joined_at || p.created_at,
    }));
  }

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
