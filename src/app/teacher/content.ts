/**
 * Copy for the /teacher single-screen landing page.
 *
 * The Thai is VERBATIM from the task spec (agent_tasks 6b823e8c) — Chris
 * supplied it and it is not to be machine-translated or reworded. The English
 * behind the toggle is a faithful translation of that Thai, written here.
 *
 * Kept in its own module for the same reason as /interview: copy changes should
 * never require touching layout, and on this page layout is load-bearing (see
 * the no-scroll constraint in TeacherContent.tsx).
 */

type Locale = "th" | "en";

export const TH = {
  lang: "th" as Locale,
  toggle: "EN",

  /** Two lines, deliberately. The break is where the sentence turns. */
  headline: [
    "ผมสอนภาษาอังกฤษให้นักศึกษาไทยมาหลายปี",
    "และปัญหาส่วนใหญ่ เริ่มมาตั้งแต่ตอนพวกเขาอายุ 5 ขวบ",
  ],

  bio: [
    "ผมชื่อแมตต์ครับ เป็นอาจารย์สอนภาษาอังกฤษชาวอเมริกัน อาศัยและสอนอยู่ที่นครศรีธรรมราชมาหลายปี",
    "นักศึกษาที่ผมสอนตั้งใจเรียนและเก่งมาก แต่หลายคนยังไม่กล้าพูดภาษาอังกฤษ เพราะไม่เคยได้ปูพื้นฐานที่ถูกต้องตั้งแต่ตอนเป็นเด็ก",
    "ผมจึงสร้าง English Allstars ขึ้นมาเพื่อลูกสาวของผมเอง ให้พวกเธอเริ่มต้นจากจุดที่ถูกต้อง ตอนนี้เปิดให้ครอบครัวอื่นได้ใช้แล้วครับ",
  ],

  cta: "ทดลองใช้ฟรี 7 วัน",

  /** Small but legible — the spec is explicit that this is not fine print. */
  terms: "ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน โดยไม่มีค่าใช้จ่าย",

  photoAlt: "แมตต์ อาจารย์สอนภาษาอังกฤษ ยืนอยู่หน้าไวท์บอร์ดกับนักศึกษา",
};

export const EN: typeof TH = {
  lang: "en",
  toggle: "TH",

  headline: [
    "I have taught English to Thai university students for years.",
    "Most of the problem starts when they are five years old.",
  ],

  bio: [
    "My name is Matt. I am an American English professor, and I have lived and taught in Nakhon Si Thammarat for years.",
    "My students work hard and they are bright, but many of them still will not speak English — because nobody built the foundation properly when they were small.",
    "So I built English Allstars for my own daughters, to start them in the right place. It is now open to other families.",
  ],

  cta: "Start your free 7-day trial",

  terms: "Cancel any time before day 7 at no charge.",

  photoAlt: "Matt, an English teacher, standing at a whiteboard with his students",
};
