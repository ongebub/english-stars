import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isTutorCode, normaliseTutorCode } from "@/lib/tutor-code";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Unified join endpoint — accepts both school codes and tutor invite codes.
 * Routes by code format: TCH-XXXXXX → tutor path, anything else → school path.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode: string = body.code;

    if (!rawCode) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const cleaned = rawCode.toUpperCase().trim().replace(/\s/g, "");

    if (isTutorCode(cleaned)) {
      return handleTutorJoin(cleaned);
    } else {
      return handleSchoolJoin(cleaned, body.child_name, body.avatar_emoji);
    }
  } catch (error: unknown) {
    console.error("Join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleTutorJoin(rawCode: string) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in first to join a tutor class", type: "tutor_auth_required" },
      { status: 401 }
    );
  }

  const code = normaliseTutorCode(rawCode);
  if (!code) {
    return NextResponse.json(
      { error: "Invalid tutor invite code format" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  // Look up invite
  const { data: invite } = await supabase
    .from("tutor_invites")
    .select("tutor_user_id, code, revoked_at")
    .eq("code", code)
    .single();

  if (!invite) {
    return NextResponse.json(
      { error: "Invite code not found. Please check with your tutor." },
      { status: 404 }
    );
  }

  if (invite.revoked_at) {
    return NextResponse.json(
      { error: "This invite code has been revoked. Please ask your tutor for a new one." },
      { status: 410 }
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
      {
        error:
          "Your tutor's subscription is not active. Please contact your tutor.",
      },
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
      {
        error:
          "This tutor's class is full. Please contact your tutor to add more seats.",
      },
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
    type: "tutor",
    tutor_name: tutorProfile?.display_name || "Your tutor",
  });
}

async function handleSchoolJoin(
  code: string,
  childName?: string,
  avatarEmoji?: string
) {
  if (!childName) {
    return NextResponse.json(
      { error: "Name is required to join a school class" },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  // Validate code
  const { data: schoolCode, error: codeError } = await supabase
    .from("school_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (codeError || !schoolCode) {
    return NextResponse.json(
      { error: "Code not found. Please check and try again. รหัสไม่ถูกต้อง" },
      { status: 404 }
    );
  }

  // Check expiry
  if (new Date(schoolCode.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. รหัสนี้หมดอายุแล้ว" },
      { status: 400 }
    );
  }

  // Count existing students on this code
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("join_code", schoolCode.code);

  if ((count || 0) >= schoolCode.max_students) {
    return NextResponse.json(
      { error: "This class is full. ห้องเรียนเต็มแล้ว" },
      { status: 400 }
    );
  }

  // Create child profile linked to the school owner
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: crypto.randomUUID(),
      display_name: childName,
      role: "child",
      parent_id: schoolCode.user_id,
      avatar_emoji: avatarEmoji || "🧒",
      join_code: schoolCode.code,
      account_type: "school",
    })
    .select()
    .single();

  if (profileError) {
    console.error("Join profile error:", profileError);
    return NextResponse.json(
      { error: "Could not join. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    type: "school",
    child_id: profile.id,
    child_name: profile.display_name,
    school_name: schoolCode.school_name,
    join_code: schoolCode.code,
  });
}
