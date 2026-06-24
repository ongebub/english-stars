import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SchoolDashboardClient from "./SchoolDashboardClient";

export const dynamic = "force-dynamic";

export default async function SchoolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify school plan
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type, status, child_count, max_students")
    .eq("user_id", user.id)
    .single();

  if (!subscription || subscription.plan_type !== "school" || subscription.status !== "active") {
    redirect("/dashboard");
  }

  // Get school code
  const { data: schoolCode } = await supabase
    .from("school_codes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get students (children linked to this school)
  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("parent_id", user.id)
    .eq("account_type", "school")
    .order("created_at", { ascending: true });

  // Get quiz attempts for all students
  const studentIds = (students || []).map((s) => s.id);
  const { data: attempts } = studentIds.length > 0
    ? await supabase
        .from("quiz_attempts")
        .select("child_id, subject_id, score, total, completed_at")
        .in("child_id", studentIds)
    : { data: [] };

  // Get subjects for reference
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title_en, slug")
    .order("sort_order");

  return (
    <SchoolDashboardClient
      schoolCode={schoolCode}
      students={students || []}
      attempts={attempts || []}
      subjects={subjects || []}
      maxStudents={subscription.max_students}
    />
  );
}
