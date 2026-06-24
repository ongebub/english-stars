import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user has school plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, max_students, status")
      .eq("user_id", user.id)
      .single();

    if (!subscription || subscription.plan_type !== "school" || subscription.status !== "active") {
      return NextResponse.json({ error: "School plan required" }, { status: 403 });
    }

    const body = await req.json();
    const schoolName = body.school_name;
    if (!schoolName) {
      return NextResponse.json({ error: "School name required" }, { status: 400 });
    }

    // Check if user already has a code
    const { data: existing } = await supabase
      .from("school_codes")
      .select("code, school_name")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ code: existing.code, school_name: existing.school_name });
    }

    // Generate unique code
    let code = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const { error } = await supabase.from("school_codes").insert({
        user_id: user.id,
        code,
        school_name: schoolName,
        max_students: subscription.max_students || 35,
      });
      if (!error) {
        return NextResponse.json({ code, school_name: schoolName });
      }
      code = generateJoinCode();
      attempts++;
    }

    return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });
  } catch (error: unknown) {
    console.error("Generate code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
