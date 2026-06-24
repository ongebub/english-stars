import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { code, child_name, avatar_emoji } = body;

    if (!code || !child_name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    // Validate code
    const { data: schoolCode, error: codeError } = await supabase
      .from("school_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (codeError || !schoolCode) {
      return NextResponse.json(
        { error: "Invalid code. รหัสไม่ถูกต้อง" },
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
        display_name: child_name,
        role: "child",
        parent_id: schoolCode.user_id,
        avatar_emoji: avatar_emoji || "🧒",
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
      child_id: profile.id,
      child_name: profile.display_name,
      school_name: schoolCode.school_name,
      join_code: schoolCode.code,
    });
  } catch (error: unknown) {
    console.error("Join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
