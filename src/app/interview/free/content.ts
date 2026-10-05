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
 *  reworded from it. The page carries robots noindex (see page.tsx). Do not
 *  reword heroH1 or the trial terms; those come from ../content.ts and are
 *  already approved.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { TH, EN } from "../content";

export { LINE_ADD_FRIEND_URL } from "@/lib/social";

export const FREE_NEW = {
  th: {
    // One line of what they get, under the H1.
    sub: "กรอกอีเมลเพื่อรับคำถามทั้ง 5 ข้อ พร้อมคำตอบตัวอย่างและวิธีฝึกที่บ้าน ฟรี",
    // The one button.
    cta: "รับ 5 คำถามฟรี",
    // Heading over the questions once revealed.
    resultH2: "นี่คือคำถามทั้ง 5 ข้อ",
    // Shown when the email request failed but the questions are shown anyway.
    emailFailed: "ส่งอีเมลไม่สำเร็จ แต่อ่านคำถามด้านล่างได้เลย",
    // LINE block under the questions.
    lineLead: "รับเคล็ดลับเตรียมสอบสัมภาษณ์ฟรีทาง LINE",
    lineCta: "เพิ่มเพื่อนทาง LINE",
  },
  en: {
    sub: "Enter your email to get all 5 questions, with model answers and how to practise at home. Free.",
    cta: "Get the 5 questions free",
    resultH2: "Here are your 5 questions",
    emailFailed: "The email did not send, but you can read the questions below.",
    lineLead: "Get free interview-prep tips on LINE",
    lineCta: "Add friend on LINE",
  },
};

export function getFreeCopy(lang: "th" | "en") {
  const base = lang === "th" ? TH : EN;
  return { ...base, ...FREE_NEW[lang] };
}
