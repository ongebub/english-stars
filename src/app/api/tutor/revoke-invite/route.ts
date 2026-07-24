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
    const code: string = body.code;

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Verify the authenticated user owns this invite
    const { data: invite } = await supabase
      .from("tutor_invites")
      .select("code")
      .eq("code", code)
      .eq("tutor_user_id", user.id)
      .is("revoked_at", null)
      .single();

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found or already revoked" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("tutor_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("code", code)
      .eq("tutor_user_id", user.id);

    if (error) {
      console.error("Failed to revoke invite:", error);
      return NextResponse.json(
        { error: "Failed to revoke invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Revoke invite error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to revoke invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
