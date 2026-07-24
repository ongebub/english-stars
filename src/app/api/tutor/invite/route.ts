import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TCH-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify tutor has active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("tier, seat_count, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!subscription || subscription.tier !== "tutor") {
      return NextResponse.json(
        { error: "Active tutor subscription required" },
        { status: 403 }
      );
    }

    // Check active student count vs seat_count
    const { count: activeStudents } = await supabase
      .from("tutor_students")
      .select("student_user_id", { count: "exact", head: true })
      .eq("tutor_user_id", user.id)
      .is("removed_at", null);

    if (
      subscription.seat_count &&
      activeStudents !== null &&
      activeStudents >= subscription.seat_count
    ) {
      return NextResponse.json(
        {
          error: `All ${subscription.seat_count} seats are filled. Upgrade your plan to add more students.`,
        },
        { status: 402 }
      );
    }

    // Generate unique code
    let code = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const { error: insertError } = await supabase
        .from("tutor_invites")
        .insert({
          code,
          tutor_user_id: user.id,
        });

      if (!insertError) break;
      code = generateInviteCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique invite code" },
        { status: 500 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || "https://englishallstars.com";

    return NextResponse.json({
      code,
      join_url: `${origin}/join/${code}`,
    });
  } catch (error: unknown) {
    console.error("Invite creation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
