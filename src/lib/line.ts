import { createHmac, timingSafeEqual } from "crypto";

/**
 * LINE Messaging API helpers for the @209khnuv Official Account.
 *
 * Thai strings below are NEW 2026-10-20 and are written by Jinx. They had a
 * second model read (no native speaker available); see entities notes.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.englishallstars.com").replace(/\/$/, "");

/** The same free worksheet /interview/free emails out (public-read bucket). */
export function freePackUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/printables/interview-20-questions.pdf`;
}

export function followMessages(): { type: "text"; text: string }[] {
  return [
    {
      type: "text",
      text:
        "สวัสดีค่ะ ขอบคุณที่เพิ่ม English Allstars เป็นเพื่อนนะคะ\n" +
        "นี่คือใบงานฝึกสัมภาษณ์ 20 คำถาม ฟรี พิมพ์ลงกระดาษ A4 ได้เลยค่ะ\n" +
        freePackUrl(),
    },
    {
      type: "text",
      text:
        "อยากได้ใบงานเพิ่มสำหรับฝึกที่บ้าน? ดูชุดใบงาน PDF ราคาเริ่มต้น 59 บาทค่ะ\n" +
        `${SITE}/worksheets`,
    },
  ];
}

export function autoReplyMessages(): { type: "text"; text: string }[] {
  return [{ type: "text", text: "ขอบคุณที่ส่งข้อความหาเรานะคะ ทีมงานจะตอบกลับโดยเร็วที่สุดค่ะ" }];
}

/** Verifies x-line-signature: base64(HMAC-SHA256(channel secret, raw body)). */
export function verifyLineSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function lineReply(
  token: string,
  replyToken: string,
  messages: { type: "text"; text: string }[]
): Promise<boolean> {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.error("LINE reply failed:", res.status);
    return res.ok;
  } catch (err) {
    console.error("LINE reply error:", err instanceof Error ? err.message : "unknown");
    return false;
  }
}
