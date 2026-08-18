import type { Metadata } from "next";
import TeacherContent from "./TeacherContent";

const TITLE = "ผมสอนภาษาอังกฤษให้นักศึกษาไทยมาหลายปี | English Allstars";
const DESCRIPTION =
  "อาจารย์สอนภาษาอังกฤษชาวอเมริกันในนครศรีธรรมราช สร้างแอปเรียนภาษาอังกฤษให้ลูกสาวของตัวเอง และตอนนี้เปิดให้ครอบครัวอื่นได้ใช้แล้ว ทดลองใช้ฟรี 7 วัน";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  // REMOVE once (a) IMG_1905 is in place and (b) Matt's consent for his surname
  // to appear in paid advertising is confirmed in writing. Until both are true
  // this page is a work in progress carrying an unresolved consent question
  // about a real person, and it should not be indexed. Paid ad traffic arrives
  // by URL and is unaffected.
  robots: { index: false, follow: true },

  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://englishallstars.com/teacher",
    siteName: "English Allstars",
    locale: "th_TH",
    type: "profile",
  },
};

export default function TeacherPage() {
  return <TeacherContent />;
}
