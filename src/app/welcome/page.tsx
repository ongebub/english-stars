import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function WelcomePage({ searchParams }: Props) {
  const { session_id } = await searchParams;
  const supabase = await createClient();

  // Determine tier from subscription
  let isTutor = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", user.id)
      .single();

    if (sub?.plan_type === "school" || sub?.plan_type === "tutor") {
      isTutor = true;
    }
  }

  // Suppress unused variable warning — session_id is read from query params
  // and may be used for Stripe verification in the future
  void session_id;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full text-center">
        <Image
          src="/logo-small.png"
          alt="English Allstars"
          width={120}
          height={120}
          className="mx-auto mb-4"
        />

        {/* Celebration */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-text-dark font-nunito mb-2">
            Welcome to English Allstars!
          </h1>
          <p className="font-sarabun text-text-mid text-lg mb-6">
            ยินดีต้อนรับสู่ English Allstars!
          </p>

          {isTutor ? (
            <>
              <div className="bg-sky-dark/10 rounded-xl p-4 mb-6">
                <p className="text-text-dark font-nunito font-bold">
                  Your tutor account is ready!
                </p>
                <p className="font-sarabun text-text-mid text-sm mt-1">
                  บัญชีติวเตอร์ของคุณพร้อมแล้ว!
                </p>
                <p className="text-text-mid text-sm mt-2 font-nunito">
                  Set up your class by generating invite codes and sharing them with your students.
                </p>
                <p className="font-sarabun text-text-light text-xs mt-1">
                  ตั้งค่าชั้นเรียนโดยสร้างรหัสเชิญและแชร์ให้นักเรียน
                </p>
              </div>
              <Link
                href="/tutor/dashboard"
                className="block w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors"
              >
                Set Up Your Class / ตั้งค่าชั้นเรียน
              </Link>
            </>
          ) : (
            <>
              <div className="bg-leaf/10 rounded-xl p-4 mb-6">
                <p className="text-text-dark font-nunito font-bold">
                  Your subscription is active!
                </p>
                <p className="font-sarabun text-text-mid text-sm mt-1">
                  สมาชิกของคุณเปิดใช้งานแล้ว!
                </p>
                <p className="text-text-mid text-sm mt-2 font-nunito">
                  All subjects and modules are now unlocked. Start learning now!
                </p>
                <p className="font-sarabun text-text-light text-xs mt-1">
                  ทุกวิชาและโมดูลถูกปลดล็อกแล้ว เริ่มเรียนเลย!
                </p>
              </div>
              <Link
                href="/learn"
                className="block w-full bg-leaf text-white font-bold text-lg py-4 rounded-xl hover:bg-leaf-dark transition-colors"
              >
                Start Learning / เริ่มเรียนรู้
              </Link>
            </>
          )}
        </div>

        {/* Contact */}
        <p className="text-xs text-text-light">
          Questions? Contact us at{" "}
          <a
            href="mailto:info@englishallstars.com"
            className="text-sky-dark hover:underline"
          >
            info@englishallstars.com
          </a>
        </p>
      </div>
    </div>
  );
}
