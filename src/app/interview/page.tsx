import type { Metadata } from "next";
import InterviewContent from "./InterviewContent";

const TITLE = "5 คำถามที่เด็กมักเจอในการสอบสัมภาษณ์เข้าโรงเรียน | English Allstars";
const DESCRIPTION =
  "คำถามสัมภาษณ์เข้าโรงเรียนหลักสูตรภาษาอังกฤษ 5 ข้อที่เจอบ่อยที่สุด พร้อมคำตอบตัวอย่าง สิ่งที่กรรมการฟัง ข้อผิดพลาดที่พบบ่อย และวิธีฝึกที่บ้าน อ่านฟรี ไม่ต้องสมัคร";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  // ── REMOVE THIS ONCE THE THAI COPY IS APPROVED ─────────────────────────────
  // The copy in content.ts is PLACEHOLDER and has not been through Chris or
  // Naparat (see the banner at the top of that file, and task 3745fb43). Paid ad
  // traffic reaches this page by URL and is entirely unaffected by noindex, so
  // this costs the page's actual job nothing — but it stops Google indexing
  // unapproved Thai, which would be awkward to walk back.
  //
  // This page has genuine organic potential for "คำถามสัมภาษณ์เข้าโรงเรียน", so
  // deleting these two lines is worth doing as soon as the real copy lands.
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://englishallstars.com/interview",
    siteName: "English Allstars",
    images: [{ url: "/interview/interview-01.jpg", width: 640, height: 640, alt: "การฝึกสัมภาษณ์ภาษาอังกฤษสำหรับเด็ก" }],
    locale: "th_TH",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/interview/interview-01.jpg"],
  },
};

/**
 * NOTE — no logged-in redirect here, unlike the root page.
 *
 * Root sends authenticated users to /learn. This page must NOT, because it is
 * the destination of a paid ad: a parent who already has an account can still
 * legitimately arrive from the ad, share the link, or come back for the
 * worksheet. Bouncing them to /learn would silently break those links and,
 * worse, make the ad's landing-page metrics disagree with reality.
 */
export default function InterviewPage() {
  return <InterviewContent />;
}
