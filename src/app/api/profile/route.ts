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
    const { display_name, role, avatar_emoji } = body;

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

    if (role === 'parent') {
      // Parent profile: insert directly with the user's auth id
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name,
          role: 'parent',
          avatar_emoji: avatar_emoji || '🧒',
          parent_id: null,
        } as never)
        .select()
        .single();

      if (error) {
        console.error('Parent profile creation error:', error);
        const msg = error.code === '23505'
          ? 'Profile already exists. โปรไฟล์มีอยู่แล้ว'
          : 'Could not create profile. ไม่สามารถสร้างโปรไฟล์ได้';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      return NextResponse.json({ profile }, { status: 201 });
    } else {
      // Child profile: use the server-side RPC function
      const { data: profile, error } = await supabase.rpc(
        'create_child_profile',
        {
          p_display_name: display_name,
          p_avatar_emoji: avatar_emoji || '🧒',
        }
      );

      if (error) {
        console.error('Child profile creation error:', error);
        return NextResponse.json(
          { error: 'Could not add child profile. ไม่สามารถเพิ่มโปรไฟล์เด็กได้' },
          { status: 400 }
        );
      }

      return NextResponse.json({ profile }, { status: 201 });
    }
  } catch (err) {
    console.error('Profile API error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
