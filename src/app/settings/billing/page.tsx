import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string; labelTh: string }> = {
    active: { bg: "bg-leaf/20", text: "text-leaf-dark", label: "Active", labelTh: "ใช้งานอยู่" },
    trialing: { bg: "bg-sky/20", text: "text-sky-dark", label: "Trial", labelTh: "ทดลองใช้" },
    past_due: { bg: "bg-red-100", text: "text-red-600", label: "Past Due", labelTh: "เลยกำหนดชำระ" },
    canceled: { bg: "bg-gray-100", text: "text-gray-500", label: "Canceled", labelTh: "ยกเลิกแล้ว" },
  };
  const s = map[status] || map.canceled;
  return (
    <span className={`inline-block px-3 py-1 rounded-xl text-sm font-bold ${s.bg} ${s.text}`}>
      {s.label} / {s.labelTh}
    </span>
  );
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const tierLabel =
    sub?.plan_type === "school" || sub?.plan_type === "tutor"
      ? { en: "Tutor", th: "ติวเตอร์" }
      : { en: "Individual", th: "รายบุคคล" };

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const seatCount = sub?.max_students || sub?.child_count || 0;
  const isTutor = sub?.plan_type === "school" || sub?.plan_type === "tutor";
  const monthlyPrice = isTutor ? seatCount * 250 : 750;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <h1 className="text-2xl font-extrabold text-text-dark font-nunito mb-1">
          Billing
        </h1>
        <p className="font-sarabun text-text-mid mb-6">การเรียกเก็บเงิน</p>

        {!sub || sub.status === "inactive" ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-text-dark font-nunito font-bold mb-1">
              No active subscription
            </p>
            <p className="text-text-mid font-sarabun text-sm mb-6">
              ยังไม่มีสมาชิกที่ใช้งานอยู่
            </p>
            <Link
              href="/subscribe"
              className="inline-block bg-leaf text-white font-bold px-8 py-3 rounded-xl hover:bg-leaf-dark transition-colors"
            >
              Subscribe Now / สมัครเลย
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-5">
            {/* Past due banner */}
            {sub.status === "past_due" && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-sm">
                <p className="font-bold text-red-600 font-nunito">
                  Your payment failed — please update your card.
                </p>
                <p className="font-sarabun text-red-500 mt-1">
                  การชำระเงินล้มเหลว — กรุณาอัปเดตบัตรของคุณ
                </p>
              </div>
            )}

            {/* Cancel warning */}
            {"cancel_at_period_end" in sub &&
              !!(sub as Record<string, unknown>).cancel_at_period_end &&
              periodEnd && (
                <div className="bg-sun/30 border-2 border-sun rounded-xl p-4 text-sm space-y-2">
                  <p className="font-bold text-text-dark font-nunito">
                    Your subscription will end on {periodEnd}.
                  </p>
                  <p className="font-sarabun text-text-mid">
                    สมาชิกของคุณจะสิ้นสุดในวันที่ {periodEnd}
                  </p>
                  <p className="font-sarabun text-text-mid text-xs border-t border-sun/50 pt-2">
                    ข้อมูลความคืบหน้าของลูกจะถูกเก็บไว้ 12 เดือน หากคุณกลับมาสมัครใหม่ภายในระยะเวลาดังกล่าว ทุกอย่างจะเหมือนเดิม
                  </p>
                  <p className="font-sarabun text-text-light text-xs">
                    Your child&apos;s progress data is kept for 12 months. If you resubscribe within that time, everything will be as you left it.
                  </p>
                </div>
              )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-dark font-nunito">
                Status / สถานะ
              </span>
              {statusBadge(sub.status)}
            </div>

            {/* Tier */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-dark font-nunito">
                Plan / แพลน
              </span>
              <span className="text-sm text-text-dark">
                {tierLabel.en}{" "}
                <span className="font-sarabun text-text-mid">{tierLabel.th}</span>
              </span>
            </div>

            {/* Seats (tutor only) */}
            {isTutor && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-dark font-nunito">
                  Seats / จำนวนที่นั่ง
                </span>
                <span className="text-sm text-text-dark font-bold">
                  {seatCount}
                </span>
              </div>
            )}

            {/* Next billing */}
            {periodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-dark font-nunito">
                  Next billing / เรียกเก็บครั้งถัดไป
                </span>
                <span className="text-sm text-text-dark">{periodEnd}</span>
              </div>
            )}

            {/* Monthly price */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-dark font-nunito">
                Monthly price / ราคาต่อเดือน
              </span>
              <span className="text-lg font-black text-sky-dark">
                ฿{monthlyPrice.toLocaleString()}
              </span>
            </div>

            {/* Manage button */}
            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) redirect("/login");

                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/stripe/portal`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id }),
                  }
                );
                const data = await res.json();
                if (data.url) {
                  redirect(data.url);
                }
              }}
            >
              <button
                type="submit"
                className="w-full bg-sky-dark text-white font-bold text-lg py-4 rounded-xl hover:bg-sky-dark/90 transition-colors"
              >
                Manage Subscription / จัดการสมาชิก
              </button>
            </form>
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-6">
          <Link
            href="/dashboard"
            className="text-sky-dark font-semibold text-sm hover:underline"
          >
            &larr; Back to Dashboard / กลับไปแดชบอร์ด
          </Link>
        </div>
      </div>
    </div>
  );
}
