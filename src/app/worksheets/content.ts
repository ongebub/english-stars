/**
 * Copy for /worksheets and /worksheets/thanks.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  THAI: no native reviewer exists or is planned (Chris, 2026-10-05).
 *
 *  Strings marked NEW below were written by Jinx on 2026-10-08 and have had no
 *  second read. They are deliberately short. Strings marked REUSED are lifted
 *  unchanged from LandingContent.tsx and must not be edited here. Product
 *  titles stay English in both languages, as they are on the PDF covers.
 *  Pack descriptions live in src/lib/worksheet-shop.ts, next to the prices.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { TH as LANDING_TH, EN as LANDING_EN } from "../LandingContent";

export const SHOP_NEW = {
  th: {
    h1: "ใบงานภาษาอังกฤษ สำหรับพิมพ์ที่บ้าน", // NEW
    sub: "ใบงาน PDF พร้อมพิมพ์ ฝึกกับ Ollie, Nong-Fah และ Thawan", // NEW
    pages: (n: number) => `${n} หน้า`, // NEW
    buy: "ซื้อเลย", // NEW
    soon: "เร็วๆ นี้", // NEW
    opening: "กำลังไปหน้าชำระเงิน...", // NEW
    error: "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", // NEW
    delivery: "หลังชำระเงิน เราจะส่งลิงก์ดาวน์โหลดไปที่อีเมลของคุณ ชำระด้วยบัตร", // NEW
    bundleBadge: "รวมทุกชุด", // NEW
    thanksH1: "ขอบคุณที่ซื้อใบงาน!", // NEW
    thanksSub: "ดาวน์โหลดใบงานของคุณได้เลย และเราส่งลิงก์ไปที่อีเมลของคุณด้วย", // NEW
    pendingH1: "กำลังรอการยืนยันการชำระเงิน", // NEW
    pendingSub: "กรุณารอสักครู่ แล้วรีเฟรชหน้านี้", // NEW
    notFound: "ไม่พบคำสั่งซื้อนี้", // NEW
    back: "กลับไปหน้าใบงาน", // NEW
  },
  en: {
    h1: "English worksheets to print at home",
    sub: "Ready-to-print PDF packs with Ollie, Nong-Fah and Thawan",
    pages: (n: number) => `${n} pages`,
    buy: "Buy now",
    soon: "Coming soon",
    opening: "Taking you to checkout...",
    error: "Sorry, something went wrong. Please try again.",
    delivery: "After you pay, we email you the download link. Card payment.",
    bundleBadge: "All packs",
    thanksH1: "Thank you for your purchase!",
    thanksSub: "Download your worksheets below. We have also emailed you the link.",
    pendingH1: "Waiting for your payment to be confirmed",
    pendingSub: "Please wait a moment, then refresh this page.",
    notFound: "We could not find this order.",
    back: "Back to the worksheets",
  },
};

export function getShopCopy(lang: "th" | "en") {
  const base = lang === "th" ? LANDING_TH : LANDING_EN;
  return {
    toggle: base.toggle, // REUSED
    footerPrivacy: base.footerPrivacy, // REUSED
    footerTerms: base.footerTerms, // REUSED
    download: lang === "th" ? "ดาวน์โหลดใบงาน (PDF)" : "Download the worksheet (PDF)", // REUSED from resend.ts sendPrintableEmail
    trialCta: base.heroCta, // REUSED
    trialTerms: base.heroDisclosure, // REUSED, the exact legal statement
    ...SHOP_NEW[lang],
  };
}
