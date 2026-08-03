import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import JoinClient from "./JoinClient";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { code } = await params;
  const supabase = await createClient();

  // Look up invite code
  const { data: invite } = await supabase
    .from("tutor_invites")
    .select("code, tutor_user_id, revoked_at")
    .eq("code", code)
    .single();

  if (!invite || invite.revoked_at) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          <Image
            src="/logo-small.png"
            alt="English Allstars"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-4xl mb-3">😕</p>
            <h1 className="text-xl font-bold text-text-dark font-nunito mb-2">
              This invite code is not valid
            </h1>
            <p className="font-sarabun text-text-mid text-sm mb-6">
              รหัสเชิญนี้ไม่ถูกต้อง
            </p>
            <Link
              href="/"
              className="inline-block bg-leaf text-white font-bold px-6 py-3 rounded-xl hover:bg-leaf-dark transition-colors"
            >
              Go Home / กลับหน้าแรก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get tutor display name
  const { data: tutorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", invite.tutor_user_id)
    .single();

  const tutorName = tutorProfile?.display_name || "your tutor";

  // Check if current user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center">
        <Image
          src="/logo-small.png"
          alt="English Allstars"
          width={100}
          height={100}
          className="mx-auto mb-4"
        />
        <div className="bg-white rounded-xl shadow-lg p-8">
          <p className="text-4xl mb-3">🎓</p>
          <h1 className="text-xl font-bold text-text-dark font-nunito mb-1">
            Join {tutorName}&apos;s English class
          </h1>
          <p className="font-sarabun text-text-mid text-sm mb-6">
            เข้าร่วมชั้นเรียนภาษาอังกฤษของ {tutorName}
          </p>

          {user ? (
            <JoinClient code={code} userEmail={user.email} />
          ) : (
            <div className="space-y-3">
              <Link
                href={`/signup?redirect=/join/${code}`}
                className="block w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors"
              >
                Sign Up / สมัครสมาชิก
              </Link>
              <Link
                href={`/login?redirect=/join/${code}`}
                className="block w-full bg-sky-dark text-white font-bold text-lg py-4 rounded-xl hover:bg-sky-dark/90 transition-colors"
              >
                Sign In / เข้าสู่ระบบ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
