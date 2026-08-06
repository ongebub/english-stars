import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingContent from "./LandingContent";

export const metadata: Metadata = {
  title: "English Allstars — เตรียมสอบภาษาอังกฤษสำหรับเด็กไทย อายุ 4–8 ปี",
  description:
    "บัตรคำศัพท์ นิทานอ่านตาม แบบทดสอบ และข้อสอบเสมือนจริง สำหรับเด็กไทยอายุ 4–8 ปีที่เตรียมสอบเข้าโรงเรียนหลักสูตรภาษาอังกฤษ มีเสียงอ่านจากเจ้าของภาษา",
  openGraph: {
    title: "English Allstars — เตรียมสอบภาษาอังกฤษสำหรับเด็กไทย อายุ 4–8 ปี",
    description:
      "บัตรคำศัพท์ นิทานอ่านตาม แบบทดสอบ และข้อสอบเสมือนจริง สำหรับเด็กไทยอายุ 4–8 ปีที่เตรียมสอบเข้าโรงเรียนหลักสูตรภาษาอังกฤษ",
    url: "https://englishallstars.com",
    siteName: "English Allstars",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "English Allstars logo" }],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "English Allstars — เตรียมสอบภาษาอังกฤษสำหรับเด็กไทย อายุ 4–8 ปี",
    description:
      "บัตรคำศัพท์ นิทานอ่านตาม แบบทดสอบ และข้อสอบเสมือนจริง สำหรับเด็กไทยอายุ 4–8 ปีที่เตรียมสอบเข้าโรงเรียนหลักสูตรภาษาอังกฤษ",
    images: ["/logo.png"],
  },
};

async function getStats() {
  try {
    const supabase = await createClient();
    const [subjects, flashcards, pages, quizQs, picqQs] = await Promise.all([
      supabase.from("subjects").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("flashcards").select("id", { count: "exact", head: true }),
      supabase.from("ebook_pages").select("id", { count: "exact", head: true }),
      supabase.from("quiz_questions").select("id", { count: "exact", head: true }),
      supabase.from("picture_quiz_questions").select("id", { count: "exact", head: true }),
    ]);
    return {
      subjects: subjects.count ?? 0,
      flashcards: flashcards.count ?? 0,
      pages: pages.count ?? 0,
      quizQuestions: (quizQs.count ?? 0) + (picqQs.count ?? 0),
    };
  } catch {
    return { subjects: 0, flashcards: 0, pages: 0, quizQuestions: 0 };
  }
}

export default async function LandingPage() {
  // Redirect logged-in users straight to /learn
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/learn");
  } catch {
    // Not logged in — show landing page
  }

  const stats = await getStats();
  return <LandingContent stats={stats} />;
}
