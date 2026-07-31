import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const studentUserId: string = body.student_user_id;

    if (!studentUserId) {
      return NextResponse.json(
        { error: "student_user_id is required" },
        { status: 400 }
      );
    }

    // Verify the authenticated user is the tutor for this student
    const { data: record } = await supabase
      .from("tutor_students")
      .select("student_user_id")
      .eq("student_user_id", studentUserId)
      .eq("tutor_user_id", user.id)
      .is("removed_at", null)
      .single();

    if (!record) {
      return NextResponse.json(
        { error: "Student not found in your class" },
        { status: 404 }
      );
    }

    // RLS policy "tutor updates own students" allows this via auth client
    const { error } = await supabase
      .from("tutor_students")
      .update({ removed_at: new Date().toISOString() })
      .eq("student_user_id", studentUserId)
      .eq("tutor_user_id", user.id)
      .is("removed_at", null);

    if (error) {
      console.error("Failed to remove student:", error);
      return NextResponse.json(
        { error: "Failed to remove student" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Remove student error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to remove student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
