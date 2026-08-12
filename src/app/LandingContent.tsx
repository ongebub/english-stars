"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { trackEvent } from "@/lib/track";

const CONTACT_LINK = "mailto:info@englishallstars.com";
const CONTACT_LABEL = "info@englishallstars.com";

// ─── copy ──────────────────────────────────────────────────────────────────────

const TH = {
  lang: "th" as const,
  toggle: "EN",
  login: "เข้าสู่ระบบ",
  footerPrivacy: "นโยบายความเป็นส่วนตัว",
  footerTerms: "ข้อกำหนดการใช้งาน",
  // Hero
  heroH1: "ปูพื้นฐานภาษาอังกฤษให้ลูก ก่อนถึงวันสอบเข้า",
  heroSub:
    "ออกแบบมาสำหรับเด็กไทยอายุ 4–8 ปี ที่กำลังเตรียมสอบเข้าโรงเรียนหลักสูตรภาษาอังกฤษ มีทั้งบัตรคำศัพท์ นิทานอ่านตาม แบบทดสอบ และข้อสอบเสมือนจริง พร้อมเสียงอ่านจากเจ้าของภาษา",
  heroCta: "ทดลองใช้ฟรี 7 วัน",
  heroSecondary: "ดูว่ามีอะไรบ้าง",
  heroDisclosure:
    "ต้องใช้บัตรเครดิตหรือบัตรเดบิตเพื่อเริ่มทดลองใช้ ทดลองฟรี 7 วัน หลังจากนั้นระบบจะเรียกเก็บเงิน 750 บาทต่อเดือนโดยอัตโนมัติ ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน โดยไม่มีค่าใช้จ่าย",
  // Who made this
  whoH2: "สร้างโดยอาจารย์สอนภาษาอังกฤษชาวอเมริกัน ที่อาศัยอยู่ในประเทศไทย",
  whoP1: "English Allstars สร้างขึ้นโดยสองพี่น้อง คนหนึ่งคือแมตต์ อาจารย์สอนภาษาอังกฤษชาวอเมริกัน ที่ใช้ชีวิตและสอนหนังสืออยู่ที่นครศรีธรรมราชมาหลายปี อีกคนหนึ่งเป็นนักพัฒนาซอฟต์แวร์",
  whoP2: "แมตต์สร้างแอปนี้ขึ้นมาเพื่อลูกสาวของเขาเอง เขาเห็นครอบครัวไทยจ่ายค่าเรียนพิเศษให้ลูก แต่ลูกกลับจำอะไรแทบไม่ได้ และเขารู้ดีว่าข้อสอบเข้าวัดทักษะภาษาอังกฤษด้านไหนบ้าง และด้านไหนที่ยังไม่มีใครสอน",
  whoP3: "ทุกคำศัพท์ ทุกนิทาน และทุกคำถามในแอปนี้ ถูกเลือกโดยคนที่สอนภาษาอังกฤษในประเทศไทยเป็นอาชีพ และมีลูกที่ต้องสอบเข้าแบบเดียวกับลูกของคุณ",
  // Stats
  statsH2: "เนื้อหาจริง เสียงจริง",
  statLabels: ["หัวข้อ", "บัตรคำศัพท์", "หน้านิทาน", "ข้อสอบ"],
  statsCaption:
    "บัตรคำศัพท์และหน้านิทานทุกหน้า มีเสียงอ่านจากเจ้าของภาษา ลูกของคุณจะได้ยินคำอ่านที่ถูกต้องทุกครั้ง",
  // What's inside
  insideH2: "ทุกอย่างที่ลูกต้องการในที่เดียว",
  insideBelow:
    "เลือกหัวข้อไหนก็ได้ ไม่มีลำดับตายตัว ไม่มีตารางรายสัปดาห์ ลูกของคุณเรียนเรื่องที่เขาสนใจในวันนี้ได้เลย",
  insideItems: [
    {
      emoji: "📚",
      title: "บัตรคำศัพท์พร้อมภาพประกอบ",
      desc: "ทีละคำ พร้อมเสียงอ่านภาษาอังกฤษ",
      screenshot: "/screenshot-flashcard.webp",
    },
    {
      emoji: "📖",
      title: "นิทานอ่านตาม",
      desc: "มีเสียงอ่านทีละหน้า คำจะเน้นสีตามเสียงที่อ่าน ให้ลูกอ่านตามได้",
    },
    {
      emoji: "✅",
      title: "แบบทดสอบ",
      desc: "สุ่ม 10 ข้อจากคลัง 60 ข้อ ไม่ซ้ำกันในแต่ละครั้ง พร้อมถ้วยรางวัลเมื่อทำครบ",
      screenshot: "/screenshot-quiz.webp",
    },
    {
      emoji: "✏️",
      title: "ใบงานสำหรับพิมพ์",
      desc: "ฝึกคัดลายมือที่บ้าน",
    },
    {
      emoji: "📝",
      title: "ข้อสอบเสมือนจริง",
      desc: "รูปแบบเดียวกับข้อสอบเข้าจริง",
    },
  ],
  insideCardHeading: "เนื้อหาทั้งหมด สมัครครั้งเดียว",
  insideCardCta: "ทดลองใช้ฟรี →",
  // Subject grid
  subjectH2: "หัวข้อที่ลูกจะได้เรียน",
  ageLabel46: "อายุ 4–6 ปี",
  ageLabel68: "อายุ 6–8 ปี",
  subjects46: [
    "ตัวอักษร ABC", "การออกเสียง", "ตัวเลข", "สี", "รูปทรง", "สัตว์",
    "พืช", "อาหารและเครื่องดื่ม", "อวัยวะร่างกาย", "ประสาทสัมผัสทั้งห้า",
    "ความรู้สึก", "อาชีพ", "ยานพาหนะ", "อาคารสถานที่",
    "ของใช้ในบ้าน", "ที่โรงเรียน", "ข้อสอบเสมือนจริง", "ฝึกสัมภาษณ์",
  ],
  subjects68: [
    "การผสมเสียง", "คำบุพบท", "คำกริยา", "งานอดิเรก", "คำคล้องจอง",
    "การเปรียบเทียบ", "คำคุณศัพท์", "ประธานและกริยา", "กาลเวลา", "นิทานอ่านตาม",
  ],
  // Interview
  interviewH2: "พร้อมทั้งข้อเขียนและการสัมภาษณ์",
  interviewP1:
    "การสอบเข้าส่วนใหญ่มีการสัมภาษณ์เป็นภาษาอังกฤษ ลูกของคุณจะถูกถามชื่อ อายุ สิ่งที่ชอบ สิ่งที่ทำได้ — เป็นภาษาอังกฤษ กับคนแปลกหน้า ในวันที่ตื่นเต้นที่สุดวันหนึ่งในชีวิตของเขา",
  interviewP2:
    "English Allstars ฝึกคำถามเหล่านี้โดยเฉพาะ เพื่อให้ลูกคุ้นเคยกับคำตอบไว้ล่วงหน้า",
  // Pricing
  pricingH2: "ราคาเรียบง่ายและโปร่งใส",
  pricingAnchor: "ถูกกว่าค่าเรียนพิเศษตัวต่อตัวเพียง 1 ชั่วโมงต่อเดือน",
  familyBadge: "ครอบครัว",
  familyTitle: "แพ็กเกจครอบครัว",
  familyPer: "/ เดือน",
  familyBullets: [
    "ใช้ได้ครบทั้ง 46 หัวข้อ",
    "เพิ่มลูกได้หลายคนในบัญชีเดียว",
    "ยกเลิกได้ตลอดเวลา",
  ],
  familyCta: "ทดลองใช้ฟรี 7 วัน",
  familyDisclosure:
    "ต้องใช้บัตรเครดิตหรือบัตรเดบิตเพื่อเริ่มทดลองใช้ ทดลองฟรี 7 วัน หลังจากนั้นระบบจะเรียกเก็บเงิน 750 บาทต่อเดือนโดยอัตโนมัติ ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน โดยไม่มีค่าใช้จ่าย",
  tutorBadge: "ติวเตอร์และโรงเรียน",
  tutorTitle: "สำหรับติวเตอร์และโรงเรียน",
  tutorPer: "/ คน / เดือน",
  tutorBullets: [
    "ขั้นต่ำ 5 คน",
    "เพิ่มนักเรียนและติดตามความคืบหน้ารายคน",
    "ดูสมุดคะแนนของทั้งห้องได้",
  ],
  tutorCta: "ติดต่อเรา",
  // FAQ
  faqH2: "คำถามที่พบบ่อย",
  faqs: [
    {
      q: "ลูกต้องอ่านภาษาไทยได้ไหมถึงจะใช้ได้",
      a: "ไม่จำเป็น บทเรียนเป็นภาษาอังกฤษและมีเสียงอ่านทุกคำ ส่วนหน้าจอสำหรับผู้ปกครองเป็นภาษาไทย",
    },
    {
      q: "เหมาะกับเด็กอายุเท่าไร",
      a: "ประมาณ 4–8 ปี หรือตั้งแต่ชั้นอนุบาลถึงประถมศึกษาปีที่ 2",
    },
    {
      q: "ลูกควรใช้วันละกี่นาที",
      a: "วันละ 10–15 นาทีก็เพียงพอสำหรับเด็กวัยนี้",
    },
    {
      q: "ใช้บัญชีเดียวกับลูกหลายคนได้ไหม",
      a: "ได้ แพ็กเกจครอบครัวจะเก็บความคืบหน้าของลูกแต่ละคนแยกกัน",
    },
    {
      q: "ยกเลิกอย่างไร",
      a: "ยกเลิกได้เองในหน้าตั้งค่าบัญชี ตลอดเวลา ไม่ต้องโทรและไม่ต้องส่งอีเมล",
    },
    {
      q: "จ่ายผ่านพร้อมเพย์หรือโอนธนาคารได้ไหม",
      a: "ตอนนี้ยังไม่ได้ เรารับชำระผ่านบัตรเครดิตและบัตรเดบิตเท่านั้น เรากำลังพิจารณาเพิ่มพร้อมเพย์อยู่ หากคุณสะดวกจ่ายด้วยวิธีนี้ กรุณาติดต่อเราเพื่อแจ้งให้ทราบ ความเห็นของคุณจะช่วยเราตัดสินใจ",
    },
  ],
  // Final CTA
  finalH2: "เริ่มวันนี้",
  finalSub: "ลูกของคุณเรียนคำศัพท์ภาษาอังกฤษ 10 คำแรกได้ ภายใน 10 นาที",
  finalCta: "ทดลองใช้ฟรี 7 วัน",
  finalDisclosure:
    "ต้องใช้บัตรเครดิตหรือบัตรเดบิตเพื่อเริ่มทดลองใช้ ทดลองฟรี 7 วัน หลังจากนั้นระบบจะเรียกเก็บเงิน 750 บาทต่อเดือนโดยอัตโนมัติ ยกเลิกได้ตลอดเวลาก่อนครบ 7 วัน โดยไม่มีค่าใช้จ่าย",
  finalContact: "มีคำถาม?",
  finalContactLink: "ติดต่อเรา",
};

const EN = {
  lang: "en" as const,
  toggle: "TH",
  login: "Log In",
  footerPrivacy: "Privacy Policy",
  footerTerms: "Terms of Service",
  // Hero
  heroH1: "Give your child a head start in English — before the entrance exam.",
  heroSub:
    "Built for Thai children ages 4–8 preparing for English-language school entrance exams. Flashcards, read-along storybooks, quizzes, and practice tests — all voiced by native English speakers.",
  heroCta: "Start your free 7-day trial",
  heroSecondary: "See what's inside ↓",
  heroDisclosure:
    "A credit or debit card is required to start. Free for 7 days, then 750 THB/month automatically. Cancel any time before day 7 at no charge.",
  // Who made this
  whoH2: "Made by an American English professor living in Thailand.",
  whoP1: "English Allstars was built by two brothers. One is Matt, an American English professor who has lived and taught in Nakhon Si Thammarat for years. The other is a software developer.",
  whoP2: "Matt built this app for his own daughters. He watched Thai families pay for tutoring, but their children struggled to retain anything. He knew exactly which English skills entrance exams test — and which ones nobody was teaching.",
  whoP3: "Every word, story, and question in this app was chosen by someone who teaches English in Thailand for a living, and whose children face the same entrance exam as yours.",
  // Stats
  statsH2: "Real content. Real voices.",
  statLabels: ["Subjects", "Flashcards", "Storybook pages", "Quiz questions"],
  statsCaption:
    "Every flashcard and every storybook page is voiced by a native English speaker. Your child hears the correct pronunciation every time.",
  // What's inside
  insideH2: "Everything your child needs in one place.",
  insideBelow:
    "Pick any subject and start. No fixed order, no weekly schedule. Your child learns what interests them today.",
  insideItems: [
    {
      emoji: "📚",
      title: "Illustrated flashcards",
      desc: "One word at a time, with native English audio on every card.",
      screenshot: "/screenshot-flashcard.webp",
    },
    {
      emoji: "📖",
      title: "Read-along storybooks",
      desc: "Audio plays page by page. Words are highlighted as they're read, so your child can follow along.",
    },
    {
      emoji: "✅",
      title: "Quizzes",
      desc: "10 random questions from a pool of 60 — different every time. Trophy awarded on completion.",
      screenshot: "/screenshot-quiz.webp",
    },
    {
      emoji: "✏️",
      title: "Printable worksheets",
      desc: "Handwriting practice at home.",
    },
    {
      emoji: "📝",
      title: "Practice tests",
      desc: "Same format as the real entrance exam.",
    },
  ],
  insideCardHeading: "All content. One subscription.",
  insideCardCta: "Start free trial →",
  // Subject grid
  subjectH2: "What your child will learn.",
  ageLabel46: "Ages 4–6",
  ageLabel68: "Ages 6–8",
  subjects46: [
    "ABCs", "Phonics", "Numbers", "Colors", "Shapes", "Animals",
    "Plants", "Food & Drink", "Body Parts", "Five Senses",
    "Feelings", "Jobs", "Vehicles", "Buildings",
    "Around the House", "At School", "Practice Tests", "Interview Practice",
  ],
  subjects68: [
    "Phonics Blending", "Prepositions", "Verbs", "Hobbies", "Rhyming",
    "Comparisons", "Adjectives", "Subject & Verb", "Tenses", "Read-along Stories",
  ],
  // Interview
  interviewH2: "Ready for the interview, not just the written test.",
  interviewP1:
    "Most entrance exams include a spoken English interview. Your child will be asked their name, age, likes, and abilities — in English, with a stranger, on one of the most exciting days of their life.",
  interviewP2:
    "English Allstars includes dedicated interview practice so your child already knows these answers before they walk in.",
  // Pricing
  pricingH2: "Simple, honest pricing.",
  pricingAnchor: "Less than one hour of private tutoring per month.",
  familyBadge: "FAMILY",
  familyTitle: "Family plan",
  familyPer: "/month",
  familyBullets: [
    "Access all 46 subjects",
    "Multiple children on one account",
    "Cancel any time",
  ],
  familyCta: "Start your free 7-day trial",
  familyDisclosure:
    "A credit or debit card is required to start. Free for 7 days, then 750 THB/month automatically. Cancel any time before day 7 at no charge.",
  tutorBadge: "TUTORS & SCHOOLS",
  tutorTitle: "For tutors & schools",
  tutorPer: "/seat/month",
  tutorBullets: [
    "Minimum 5 students",
    "Add students and track progress individually",
    "View a gradebook for the whole class",
  ],
  tutorCta: "Contact us",
  // FAQ
  faqH2: "Questions? We have answers.",
  faqs: [
    {
      q: "Does my child need to be able to read Thai first?",
      a: "No. Lessons are in English with audio on every word. The parent-facing screens are in Thai.",
    },
    {
      q: "What age is English Allstars for?",
      a: "Ages 4–8, or from kindergarten through Grade 2.",
    },
    {
      q: "How much time per day should my child spend on it?",
      a: "10–15 minutes a day is plenty for children this age.",
    },
    {
      q: "Can more than one child use the same account?",
      a: "Yes. The Family plan tracks each child's progress separately.",
    },
    {
      q: "How do I cancel?",
      a: "Cancel yourself from account settings, any time. No phone call, no email needed.",
    },
    {
      q: "Can I pay with PromptPay or bank transfer?",
      a: "Not yet — we currently accept credit and debit cards only. We're considering adding PromptPay. If that payment method works better for you, please contact us to let us know. Your feedback helps us decide.",
    },
  ],
  // Final CTA
  finalH2: "Start today.",
  finalSub: "Your child can be learning their first ten English words in the next ten minutes.",
  finalCta: "Start your free 7-day trial",
  finalDisclosure:
    "A credit or debit card is required to start. Free for 7 days, then 750 THB/month automatically. Cancel any time before day 7 at no charge.",
  finalContact: "Questions?",
  finalContactLink: CONTACT_LABEL,
};

// ─── sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: number; label: string }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k+` : value > 0 ? `${value}+` : "—";
  return (
    <div className="bg-white rounded-2xl p-6 text-center shadow-md flex flex-col items-center gap-1">
      <span className="text-4xl font-black text-sky-dark font-nunito">{display}</span>
      <span className="text-sm font-semibold text-text-mid font-sarabun">{label}</span>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-text-dark text-sm sm:text-base">
      <span className="mt-0.5 text-leaf font-black text-lg leading-none">✓</span>
      <span className="font-sarabun">{children}</span>
    </li>
  );
}

function ContentCard({ emoji, title, desc, screenshot }: { emoji: string; title: string; desc: string; screenshot?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col gap-2">
      {screenshot ? (
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-2 max-h-[200px]">
          <Image src={screenshot} alt={title} width={400} height={300} className="w-full h-auto object-cover object-top" />
        </div>
      ) : (
        <span className="text-3xl">{emoji}</span>
      )}
      <h3 className="font-nunito font-extrabold text-text-dark text-lg">{title}</h3>
      <p className="font-sarabun text-text-mid text-sm" style={{ lineHeight: "1.7" }}>{desc}</p>
    </div>
  );
}

function SubjectPill({ label }: { label: string }) {
  return (
    <span className="font-sarabun inline-block bg-cream text-text-dark font-semibold text-sm px-3 py-1.5 rounded-xl border border-sun/40">
      {label}
    </span>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

interface Stats {
  subjects: number;
  flashcards: number;
  pages: number;
  quizQuestions: number;
}

export default function LandingContent({ stats }: { stats: Stats }) {
  const [lang, setLang] = useState<"th" | "en">("th");
  const t = lang === "th" ? TH : EN;

  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);
  const isThai = lang === "th";

  const bodyFont = isThai ? "font-sarabun" : "font-nunito";
  const thaiLeading = { lineHeight: "1.7" };

  return (
    <div className="min-h-screen bg-white font-nunito">

      {/* ── LOGIN BUTTON (top-left) ─────────────────────────────────────────── */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/login?redirect=/learn"
          className={`bg-white border border-gray-200 shadow-md text-text-dark ${bodyFont} font-bold text-sm px-4 py-2 rounded-full hover:bg-cream transition-colors min-h-[40px] inline-block`}
        >
          {t.login}
        </Link>
      </div>

      {/* ── LANGUAGE TOGGLE (top-right) ────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setLang(lang === "th" ? "en" : "th")}
          className="bg-white border border-gray-200 shadow-md text-text-dark font-nunito font-bold text-sm px-4 py-2 rounded-full hover:bg-cream transition-colors min-h-[40px]"
          aria-label={`Switch to ${t.toggle} language`}
        >
          {t.toggle}
        </button>
      </div>

      {/* ── SECTION 1 — HERO ──────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1565C0] via-sky-dark to-[#00BCD4] text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-white/[0.05]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <Image
            src="/logo.png"
            alt="English Allstars"
            width={140}
            height={140}
            priority
            className="mx-auto mb-8 drop-shadow-xl"
          />

          <h1
            className={`${bodyFont} font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.heroH1}
          </h1>

          <p
            className={`${bodyFont} text-lg sm:text-xl opacity-90 max-w-xl mx-auto mb-10`}
            style={isThai ? thaiLeading : { lineHeight: "1.6" }}
          >
            {t.heroSub}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className={`${bodyFont} inline-flex items-center justify-center bg-sun text-text-dark font-extrabold text-lg px-8 py-4 rounded-2xl hover:bg-sun-dark transition-colors shadow-lg w-full sm:w-auto text-center min-h-[56px]`}
            >
              {t.heroCta}
            </Link>
            <a
              href="#inside"
              className={`${bodyFont} inline-flex items-center justify-center text-white font-bold text-base px-6 py-4 rounded-2xl border-2 border-white/40 hover:border-white/80 hover:bg-white/10 transition-colors w-full sm:w-auto text-center min-h-[56px]`}
            >
              {t.heroSecondary}
            </a>
          </div>

          <p
            className={`${bodyFont} mt-5 text-xs sm:text-sm opacity-60 max-w-md mx-auto`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.heroDisclosure}
          </p>

          {/* Phone mockup with real app screenshot */}
          <div className="mt-12 flex justify-center">
            <div className="relative w-[220px] sm:w-[260px] mx-auto">
              {/* Phone bezel */}
              <div className="rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="mx-auto w-24 h-5 bg-gray-800 rounded-b-2xl relative z-10" />
                {/* Screenshot */}
                <div className="rounded-[2rem] overflow-hidden -mt-1">
                  <Image
                    src="/hero-screenshot.webp"
                    alt="English Allstars read-along page showing word highlighting"
                    width={260}
                    height={590}
                    className="w-full h-auto"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* wave divider */}
        <div className="relative h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="white" />
          </svg>
        </div>
      </header>

      {/* ── SECTION 2 — WHO MADE THIS ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <div className="bg-[#FFF8EE] rounded-3xl p-8 sm:p-12 border-l-4 border-sun shadow-sm">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-sun/20 flex items-center justify-center text-5xl select-none">
              🦉
            </div>
            <div className="flex-1">
              <h2
                className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark mb-5`}
                style={isThai ? thaiLeading : undefined}
              >
                {t.whoH2}
              </h2>
              <p
                className={`${bodyFont} text-text-mid mb-4 text-base sm:text-lg`}
                style={isThai ? thaiLeading : { lineHeight: "1.65" }}
              >
                {t.whoP1}
              </p>
              <p
                className={`${bodyFont} text-text-mid mb-4 text-base`}
                style={isThai ? thaiLeading : { lineHeight: "1.65" }}
              >
                {t.whoP2}
              </p>
              <p
                className={`${bodyFont} text-text-mid text-base italic border-l-2 border-sun/60 pl-4`}
                style={isThai ? thaiLeading : { lineHeight: "1.65" }}
              >
                {t.whoP3}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — PROOF NUMBERS ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-10`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.statsH2}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {t.statLabels.map((label, i) => {
              const values = [stats.subjects, stats.flashcards, stats.pages, stats.quizQuestions];
              return <StatCard key={label} value={values[i]} label={label} />;
            })}
          </div>

          <p
            className={`${bodyFont} text-center text-text-mid text-sm sm:text-base max-w-xl mx-auto`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.statsCaption}
          </p>
        </div>
      </section>

      {/* ── SECTION 4 — WHAT'S INSIDE ─────────────────────────────────────────── */}
      <section id="inside" className="scroll-mt-4 max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <h2
          className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-4`}
          style={isThai ? thaiLeading : undefined}
        >
          {t.insideH2}
        </h2>
        <p
          className={`${bodyFont} text-text-mid text-center mb-10 max-w-xl mx-auto text-sm sm:text-base`}
          style={isThai ? thaiLeading : undefined}
        >
          {t.insideBelow}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.insideItems.map((item) => (
            <ContentCard key={item.title} emoji={item.emoji} title={item.title} desc={item.desc} screenshot={(item as { screenshot?: string }).screenshot} />
          ))}

          {/* CTA card */}
          <div className="bg-gradient-to-br from-sky-dark to-[#00BCD4] rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-center gap-3">
            <p
              className={`${bodyFont} font-black text-xl leading-snug`}
              style={isThai ? thaiLeading : undefined}
            >
              {t.insideCardHeading}
            </p>
            <Link
              href="/signup"
              className={`${bodyFont} inline-block bg-sun text-text-dark font-extrabold px-5 py-3 rounded-xl hover:bg-sun-dark transition-colors text-center text-sm mt-2`}
            >
              {t.insideCardCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — SUBJECT GRID ──────────────────────────────────────────── */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-10`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.subjectH2}
          </h2>

          {/* Subject grid screenshot */}
          <div className="mb-10 flex justify-center">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 max-w-[280px]">
              <Image src="/screenshot-subjects.webp" alt="Subject grid" width={400} height={900} className="w-full h-auto" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Ages 4–6 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-sky-dark text-white font-bold text-sm px-4 py-1.5 rounded-full mb-4 font-sarabun">
                🌱 {t.ageLabel46}
              </div>
              <div className="flex flex-wrap gap-2">
                {t.subjects46.map((s) => <SubjectPill key={s} label={s} />)}
              </div>
            </div>

            {/* Ages 6–8 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-leaf text-white font-bold text-sm px-4 py-1.5 rounded-full mb-4 font-sarabun">
                🚀 {t.ageLabel68}
              </div>
              <div className="flex flex-wrap gap-2">
                {t.subjects68.map((s) => <SubjectPill key={s} label={s} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — INTERVIEW PRACTICE ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <div className="bg-gradient-to-br from-coral/10 to-sun/20 rounded-3xl p-8 sm:p-12">
          <div className="text-4xl mb-4">🎤</div>
          <h2
            className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark mb-5`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.interviewH2}
          </h2>
          <p
            className={`${bodyFont} text-text-mid mb-4 text-base`}
            style={isThai ? thaiLeading : { lineHeight: "1.65" }}
          >
            {t.interviewP1}
          </p>
          <p
            className={`${bodyFont} text-text-mid text-base`}
            style={isThai ? thaiLeading : { lineHeight: "1.65" }}
          >
            {t.interviewP2}
          </p>
        </div>
      </section>

      {/* ── SECTION 7 — PRICING ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2
            className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-10`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.pricingH2}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Family plan */}
            <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-sky-dark/20 flex flex-col">
              <div className="inline-block bg-sky-dark text-white text-xs font-bold px-3 py-1 rounded-full mb-4 self-start font-sarabun">
                {t.familyBadge}
              </div>
              <p className={`${bodyFont} font-black text-xl text-text-dark mb-2`}>{t.familyTitle}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-black text-5xl text-text-dark font-nunito">฿750</span>
                <span className={`${bodyFont} text-text-mid font-semibold`}>{t.familyPer}</span>
              </div>
              <ul className="space-y-3 mb-5 flex-1">
                {t.familyBullets.map((b) => <CheckItem key={b}>{b}</CheckItem>)}
              </ul>
              <Link
                href="/signup"
                className={`${bodyFont} block bg-sky-dark text-white font-extrabold px-6 py-4 rounded-2xl hover:bg-[#01579B] transition-colors text-center mb-3`}
              >
                {t.familyCta}
              </Link>
              <p
                className={`${bodyFont} text-text-mid text-xs`}
                style={isThai ? thaiLeading : { lineHeight: "1.6" }}
              >
                {t.familyDisclosure}
              </p>
            </div>

            {/* Tutor plan */}
            <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-leaf/20 flex flex-col">
              <div className="inline-block bg-leaf text-white text-xs font-bold px-3 py-1 rounded-full mb-4 self-start font-sarabun">
                {t.tutorBadge}
              </div>
              <p className={`${bodyFont} font-black text-xl text-text-dark mb-2`}>{t.tutorTitle}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-black text-5xl text-text-dark font-nunito">฿250</span>
                <span className={`${bodyFont} text-text-mid font-semibold text-sm`}>{t.tutorPer}</span>
              </div>
              <ul className="space-y-3 mb-5 flex-1">
                {t.tutorBullets.map((b) => <CheckItem key={b}>{b}</CheckItem>)}
              </ul>
              <a
                href={CONTACT_LINK}
                className={`${bodyFont} block bg-leaf text-white font-extrabold px-6 py-4 rounded-2xl hover:bg-leaf-dark transition-colors text-center`}
              >
                {t.tutorCta}
              </a>
            </div>
          </div>

          <p
            className={`${bodyFont} text-center text-text-mid text-sm mt-8`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.pricingAnchor}
          </p>
        </div>
      </section>

      {/* ── SECTION 8 — FAQ ───────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <h2
          className={`${bodyFont} font-black text-2xl sm:text-3xl text-text-dark text-center mb-10`}
          style={isThai ? thaiLeading : undefined}
        >
          {t.faqH2}
        </h2>

        <div className="space-y-3">
          {t.faqs.map(({ q, a }, idx) => (
            <details
              key={q}
              open={idx === 0}
              className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-cream/50 transition-colors">
                <span
                  className={`${bodyFont} font-bold text-text-dark text-base`}
                  style={isThai ? thaiLeading : undefined}
                >
                  {q}
                </span>
                <svg
                  className="w-5 h-5 text-sky-dark flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div
                className="px-6 pb-5 border-t border-gray-50 pt-4"
              >
                <p
                  className={`${bodyFont} text-text-mid text-sm sm:text-base`}
                  style={isThai ? thaiLeading : { lineHeight: "1.65" }}
                >
                  {a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── SECTION 9 — FINAL CTA ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1565C0] via-sky-dark to-[#00BCD4] text-white">
        {/* wave top */}
        <div className="relative h-16 overflow-hidden -mb-1">
          <svg viewBox="0 0 1440 64" className="absolute top-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,0 1080,64 1440,32 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="text-5xl mb-6">⭐</div>
          <h2
            className={`${bodyFont} font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.finalH2}
          </h2>
          <p
            className={`${bodyFont} text-xl sm:text-2xl opacity-90 max-w-xl mx-auto mb-3`}
            style={isThai ? thaiLeading : { lineHeight: "1.5" }}
          >
            {t.finalSub}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 mb-4">
            <Link
              href="/signup"
              className={`${bodyFont} inline-flex items-center justify-center bg-sun text-text-dark font-extrabold text-xl px-10 py-5 rounded-2xl hover:bg-sun-dark transition-colors shadow-xl w-full sm:w-auto text-center`}
            >
              {t.finalCta}
            </Link>
          </div>

          <p
            className={`${bodyFont} text-xs sm:text-sm opacity-60 max-w-md mx-auto mb-6`}
            style={isThai ? thaiLeading : undefined}
          >
            {t.finalDisclosure}
          </p>

          <p className={`${bodyFont} text-sm opacity-70`}>
            {t.finalContact}{" "}
            <a href={CONTACT_LINK} className="underline hover:opacity-100 transition-opacity">
              {t.finalContactLink}
            </a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-text-dark text-white/60 text-xs text-center py-6 px-4 space-y-1">
        <p className="font-nunito">
          © {new Date().getFullYear()} English Allstars ·{" "}
          <a href={CONTACT_LINK} className="hover:text-white transition-colors">
            {CONTACT_LABEL}
          </a>
        </p>
        <p className={bodyFont}>
          <Link href="/privacy" className="hover:text-white transition-colors">{t.footerPrivacy}</Link>
          {" · "}
          <Link href="/terms" className="hover:text-white transition-colors">{t.footerTerms}</Link>
        </p>
      </footer>
    </div>
  );
}
