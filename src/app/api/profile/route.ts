import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated. กรุณาเข้าสู่ระบบก่อน' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { display_name, role, parent_id, avatar_emoji } = body;

    if (!display_name || !role) {
      return NextResponse.json(
        { error: 'Name and role are required. กรุณากรอกชื่อและบทบาท' },
        { status: 400 }
      );
    }

    if (role !== 'parent' && role !== 'child') {
      return NextResponse.json(
        { error: 'Role must be parent or child.' },
        { status: 400 }
      );
    }

    // For parent profiles, the id is the user's auth id.
    // For child profiles, we generate a new id (let Supabase handle it).
    const profileData: Record<string, unknown> = {
      display_name,
      role,
      avatar_emoji: avatar_emoji || null,
    };

    if (role === 'parent') {
      profileData.id = user.id;
      profileData.parent_id = null;
    } else {
      // Child profile: parent_id must be the current user
      profileData.parent_id = parent_id || user.id;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return NextResponse.json(
        { error: 'Could not create profile. ไม่สามารถสร้างโปรไฟล์ได้' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
