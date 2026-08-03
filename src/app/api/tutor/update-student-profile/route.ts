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
    const { first_name, last_name, student_id } = body;

    // If student_id is provided, this is a tutor editing a student's name
    if (student_id) {
      if (!first_name?.trim() && !last_name?.trim() && !body.display_name?.trim()) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }

      const displayName = body.display_name?.trim() ||
        `${(first_name || "").trim()} ${(last_name || "").trim()}`.trim().replace(/\s+/g, " ");

      const { data: result } = await supabase
        .rpc("tutor_update_student_name", {
          p_student: student_id,
          p_name: displayName,
        });

      if (!result) {
        return NextResponse.json(
          { error: "Student not found or not authorized" },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, display_name: displayName });
    }

    // Self-update: student filling in their name after joining
    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const displayName = `${first_name.trim()} ${last_name.trim()}`.replace(/\s+/g, " ");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Could not update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, display_name: displayName });
  } catch (error: unknown) {
    console.error("Update student profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
