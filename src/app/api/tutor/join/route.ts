import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const code: string = body.code;

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Use service_role client for DB operations (bypasses RLS)
    const supabase = getServiceSupabase();

    // Look up invite
    const { data: invite } = await supabase
      .from("tutor_invites")
      .select("tutor_user_id, code")
      .eq("code", code)
      .is("revoked_at", null)
      .single();

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    // Check tutor's subscription is active/trialing
    const { data: tutorSub } = await supabase
      .from("subscriptions")
      .select("status, seat_count, tier")
      .eq("user_id", invite.tutor_user_id)
      .in("status", ["active", "trialing"])
      .single();

    if (!tutorSub) {
      return NextResponse.json(
        { error: "Please contact your tutor - their subscription is not active" },
        { status: 403 }
      );
    }

    // Check active student count vs seat_count
    const { count: activeStudents } = await supabase
      .from("tutor_students")
      .select("student_user_id", { count: "exact", head: true })
      .eq("tutor_user_id", invite.tutor_user_id)
      .is("removed_at", null);

    if (
      tutorSub.seat_count &&
      activeStudents !== null &&
      activeStudents >= tutorSub.seat_count
    ) {
      return NextResponse.json(
        { error: "This tutor's class is full. Please contact your tutor." },
        { status: 402 }
      );
    }

    // Check if student is already enrolled with this tutor
    const { data: existing } = await supabase
      .from("tutor_students")
      .select("student_user_id")
      .eq("student_user_id", user.id)
      .eq("tutor_user_id", invite.tutor_user_id)
      .is("removed_at", null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You are already enrolled with this tutor" },
        { status: 409 }
      );
    }

    // Insert student
    const { error: insertError } = await supabase
      .from("tutor_students")
      .insert({
        student_user_id: user.id,
        tutor_user_id: invite.tutor_user_id,
        invite_code: code,
      });

    if (insertError) {
      console.error("Failed to insert tutor_student:", insertError);
      return NextResponse.json(
        { error: "Failed to join class" },
        { status: 500 }
      );
    }

    // Get tutor name for response
    const { data: tutorProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", invite.tutor_user_id)
      .single();

    return NextResponse.json({
      success: true,
      tutor_name: tutorProfile?.display_name || "Your tutor",
    });
  } catch (error: unknown) {
    console.error("Join error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to join class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
