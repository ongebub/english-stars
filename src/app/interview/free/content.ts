/**
 * Copy for /interview/free, the "five questions for an email" page.
 *
 * Almost everything is reused from ../content.ts (hero H1, the five question
 * cards, labels, form errors, offer block, trial terms). Only the block below
 * is new.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⚠  THAI NOT REVIEWED BY A NATIVE SPEAKER.
 *
 *  Every string in FREE_NEW was written by Jinx. Chris, 2026-10-05: no native
 *  reviewer is available, so do not wait on one. The strings had one
 *  independent second read that day (not a native speaker) and three were
 *  reworded from it. The page is indexable (opened 2026-10-06 on Chris's
 *  decision, still no native review). Do not
 *  reword heroH1 or the trial terms; those come from ../content.ts and are
 *  already approved.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { TH, EN } from "../content";

export { LINE_ADD_FRIEND_URL } from "@/lib/social";

export const FREE_NEW = {
  th: {
    // One line of what they get, under the H1.
    sub: "รับใบงานฝึกสัมภาษณ์ฟรีทาง LINE แตะครั้งเดียว หรือกรอกอีเมลเพื่อรับคำถามทั้ง 5 ข้อ พร้อมคำตอบตัวอย่างและวิธีฝึกที่บ้าน",
    // Primary button above the fold (NEW 2026-10-20, second model read only).
    heroLineCta: "รับใบงานฟรีทาง LINE",
    orEmail: "หรือรับทางอีเมล",
    // Always-visible shop link under the form (NEW 2026-10-20).
    shopLink: "ดูชุดใบงาน PDF ราคาเริ่มต้น ฿59",
    // The one button.
    cta: "รับ 5 คำถามฟรี",
    // Heading over the questions once revealed.
    resultH2: "นี่คือคำถามทั้ง 5 ข้อ",
    // Shown when the email request failed but the questions are shown anyway.
    emailFailed: "ส่งอีเมลไม่สำเร็จ แต่อ่านคำถามด้านล่างได้เลย",
    // The server answers 200 even when it skips a send (address already used its
    // allowance, or asked a moment ago), so the page cannot say "sent". Second-read
    // wording, not reviewed by a native speaker.
    emailSent: "รับคำขอแล้ว เราจะส่งใบงานไปที่อีเมลของคุณ หากไม่พบ ลองดูในโฟลเดอร์จดหมายขยะ หรือลองหาอีเมลที่เราเคยส่งให้ก่อนหน้านี้",
    // LINE block under the questions.
    lineLead: "รับเคล็ดลับเตรียมสอบสัมภาษณ์ฟรีทาง LINE",
    lineCta: "เพิ่มเพื่อนทาง LINE",
    // Packs block, after the LINE block. NEW 2026-10-19, no second read.
    packsLead: "อยากได้ใบงานเพิ่มสำหรับพิมพ์ฝึกที่บ้าน? ดูชุดใบงาน PDF กับ Ollie และ Nong-Fah",
    packsCta: "ดูชุดใบงาน",
  },
  en: {
    sub: "Get the free interview worksheet on LINE in one tap, or enter your email for all 5 questions with model answers and how to practise at home.",
    heroLineCta: "Get the free worksheet on LINE",
    orEmail: "or get it by email",
    shopLink: "See our PDF worksheet packs, from \u0E3F59",
    cta: "Get the 5 questions free",
    resultH2: "Here are your 5 questions",
    emailFailed: "The email did not send, but you can read the questions below.",
    emailSent: "Request received. We will email the worksheet to you. If it is not there, check your spam folder, or look for an email we sent you earlier.",
    lineLead: "Get free interview-prep tips on LINE",
    lineCta: "Add friend on LINE",
    packsLead: "Want more worksheets to print and practise at home? See our PDF packs with Ollie and Nong-Fah.",
    packsCta: "See the printable packs",
  },
};

export function getFreeCopy(lang: "th" | "en") {
  const base = lang === "th" ? TH : EN;
  return { ...base, ...FREE_NEW[lang] };
}
