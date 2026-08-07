import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get parent profile
  await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get subscription (all columns)
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const isTutor =
    (subscription as Record<string, unknown> | null)?.tier === "tutor" ||
    subscription?.plan_type === "school";

  // Children (family accounts)
  let children: {
    id: string;
    display_name: string;
    avatar_emoji: string | null;
    created_at: string;
  }[] = [];

  if (!isTutor) {
    const { data: childRows } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_emoji, created_at")
      .eq("parent_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    children = childRows || [];
  }

  // Students (tutor accounts)
  let students: {
    id: string;
    display_name: string;
    avatar_emoji: string | null;
    created_at: string;
    email: string | null;
  }[] = [];

  if (isTutor) {
    const { data: tutorStudentRows } = await supabase.rpc(
      "get_tutor_students",
      { p_tutor: user.id }
    );
    students = (tutorStudentRows || []).map(
      (r: {
        student_user_id: string;
        display_name: string;
        avatar_emoji: string | null;
        joined_at: string;
        email: string | null;
      }) => ({
        id: r.student_user_id,
        display_name: r.display_name || r.email || "Student",
        avatar_emoji: r.avatar_emoji,
        created_at: r.joined_at,
        email: r.email,
      })
    );
  }

  const sub = subscription as Record<string, unknown> | null;

  return (
    <AccountClient
      email={user.email || ""}
      subscription={
        sub
          ? {
              status: (sub.status as string) || "inactive",
              plan_type: (sub.plan_type as string) || "family",
              tier: (sub.tier as string) || null,
              current_period_end: (sub.current_period_end as string) || null,
              trial_end: (sub.trial_end as string) || null,
              child_count: (sub.child_count as number) || 0,
              max_students: (sub.max_students as number) || 0,
            }
          : null
      }
      isTutor={isTutor}
      childProfiles={children}
      students={students}
    />
  );
}
