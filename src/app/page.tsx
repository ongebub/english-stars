import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Swap to a LINE URL when ready
const CONTACT_LINK = "mailto:info@englishallstars.com";
const CONTACT_LABEL = "info@englishallstars.com";

export const metadata: Metadata = {
  title: "English Allstars — English for Thai Children Ages 4–8",
  description:
    "Flashcards, storybooks, quizzes, and practice tests built for Thai children preparing for English-language school entrance exams. Every word voiced by a native English speaker.",
  openGraph: {
    title: "English Allstars — English for Thai Children Ages 4–8",
    description:
      "Flashcards, storybooks, quizzes, and practice tests built for Thai children preparing for English-language school entrance exams.",
    url: "https://englishallstars.com",
    siteName: "English Allstars",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "English Allstars logo" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "English Allstars — English for Thai Children Ages 4–8",
    description:
      "Flashcards, storybooks, quizzes, and practice tests built for Thai children preparing for English-language school entrance exams.",
    images: ["/logo.png"],
  },
};

// ─── data ──────────────────────────────────────────────────────────────────────
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

// ─── helpers ───────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: number; label: string }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k+` : value > 0 ? `${value}+` : "—";
  return (
    <div className="bg-white rounded-2xl p-6 text-center shadow-md flex flex-col items-center gap-1">
      <span className="text-4xl font-black text-sky-dark font-nunito">{display}</span>
      <span className="text-sm font-semibold text-text-mid">{label}</span>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-text-dark text-sm sm:text-base">
      <span className="mt-0.5 text-leaf font-black text-lg leading-none">✓</span>
      <span>{children}</span>
    </li>
  );
}

function ContentCard({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col gap-2">
      <span className="text-3xl">{emoji}</span>
      <h3 className="font-nunito font-extrabold text-text-dark text-lg">{title}</h3>
      <p className="text-text-mid text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function SubjectPill({ label }: { label: string }) {
  return (
    <span className="inline-block bg-cream text-text-dark font-semibold text-sm px-3 py-1.5 rounded-xl border border-sun/40">
      {label}
    </span>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-white font-nunito">

      {/* ── SECTION 1 — HERO ─────────────────────────────────────────────────── */}
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

          <h1 className="font-nunito font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-2">
            Give your child a real head start in English.
          </h1>
          {/* THAI: "มอบโอกาสให้ลูกเริ่มต้นภาษาอังกฤษได้จริง" */}
          <p className="font-sarabun text-xl opacity-90 mb-6">
            มอบโอกาสให้ลูกเริ่มต้นภาษาอังกฤษได้จริง
          </p>

          <p className="text-lg sm:text-xl opacity-90 max-w-xl mx-auto leading-relaxed mb-2">
            Built for Thai children ages 4–8 preparing for English-language school entrance exams.
            Flashcards, storybooks, quizzes, and practice tests — all voiced by native English speakers.
          </p>
          {/* THAI: "สำหรับเด็กไทยอายุ 4–8 ปีที่เตรียมสอบเข้าโรงเรียนภาษาอังกฤษ บัตรคำ หนังสืออ่านเสียง แบบทดสอบ และข้อสอบฝึกซ้อม — ทุกอย่างพากย์เสียงโดยเจ้าของภาษา" */}
          <p className="font-sarabun text-base opacity-80 max-w-xl mx-auto mb-10">
            สำหรับเด็กไทยอายุ 4–8 ปีที่เตรียมสอบเข้าโรงเรียนภาษาอังกฤษ บัตรคำ หนังสืออ่านเสียง แบบทดสอบ และข้อสอบฝึกซ้อม — ทุกอย่างพากย์เสียงโดยเจ้าของภาษา
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-block bg-sun text-text-dark font-extrabold text-lg px-8 py-4 rounded-2xl hover:bg-sun-dark transition-colors shadow-lg w-full sm:w-auto text-center min-h-[56px] flex items-center justify-center"
            >
              {/* THAI: "เริ่มทดลองใช้ฟรี 7 วัน" */}
              Start your 7-day free trial
            </Link>
            <a
              href="#inside"
              className="inline-block text-white font-bold text-base px-6 py-4 rounded-2xl border-2 border-white/40 hover:border-white/80 hover:bg-white/10 transition-colors w-full sm:w-auto text-center min-h-[56px] flex items-center justify-center"
            >
              {/* THAI: "ดูเนื้อหาข้างใน" */}
              See what&apos;s inside ↓
            </a>
          </div>

          <p className="mt-5 text-sm opacity-70">
            {/* THAI: "ไม่ต้องใช้บัตรเครดิต — ยกเลิกได้ทุกเมื่อ" */}
            No credit card required · Cancel any time
          </p>
        </div>

        {/* wave divider */}
        <div className="relative h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="white" />
          </svg>
        </div>
      </header>

      {/* ── SECTION 2 — WHO MADE THIS ────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <div className="bg-cream rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row gap-8 items-center">
          {/* character placeholder — swap in Ollie illustration */}
          <div className="flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-sky/30 flex items-center justify-center text-6xl select-none">
            🦉
          </div>
          <div>
            <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark mb-4">
              Made by an American English professor living in Thailand.
            </h2>
            {/* THAI: "สร้างโดยอาจารย์ภาษาอังกฤษชาวอเมริกันที่อาศัยอยู่ในไทย" */}
            <p className="font-sarabun text-text-mid mb-4">
              สร้างโดยอาจารย์ภาษาอังกฤษชาวอเมริกันที่อาศัยอยู่ในไทย
            </p>
            <p className="text-text-mid leading-relaxed mb-3">
              English Allstars was built by two brothers — an American English professor who has
              taught at Thai universities for over a decade, and a software developer. They built it
              for the professor&apos;s own daughter as she prepared for school entrance exams, and
              decided to share it with every family in Thailand who faces the same challenge.
            </p>
            {/* THAI: "English Allstars สร้างโดยพี่น้องสองคน — อาจารย์ภาษาอังกฤษชาวอเมริกันที่สอนในมหาวิทยาลัยไทยมากกว่าสิบปี และนักพัฒนาซอฟต์แวร์ พวกเขาสร้างมันเพื่อลูกสาวของอาจารย์ขณะเตรียมสอบเข้าโรงเรียน และตัดสินใจแบ่งปันให้ทุกครอบครัวในไทยที่เผชิญความท้าทายเดียวกัน" */}
            <p className="font-sarabun text-text-mid text-sm leading-relaxed">
              English Allstars สร้างโดยพี่น้องสองคน — อาจารย์ภาษาอังกฤษชาวอเมริกันที่สอนในมหาวิทยาลัยไทยมากกว่าสิบปี และนักพัฒนาซอฟต์แวร์ พวกเขาสร้างมันเพื่อลูกสาวของอาจารย์ขณะเตรียมสอบเข้าโรงเรียน และตัดสินใจแบ่งปันให้ทุกครอบครัวในไทยที่เผชิญความท้าทายเดียวกัน
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — PROOF NUMBERS ────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark text-center mb-2">
            Real content. Real voices.
          </h2>
          {/* THAI: "เนื้อหาจริง เสียงจริง" */}
          <p className="font-sarabun text-text-mid text-center mb-10">เนื้อหาจริง เสียงจริง</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard value={stats.subjects} label="Subjects" />
            <StatCard value={stats.flashcards} label="Flashcards" />
            <StatCard value={stats.pages} label="Storybook pages" />
            <StatCard value={stats.quizQuestions} label="Quiz questions" />
          </div>

          <p className="text-center text-text-mid text-sm sm:text-base max-w-xl mx-auto">
            Every flashcard and every storybook page is voiced by a native English speaker.
          </p>
          {/* THAI: "ทุกบัตรคำและทุกหน้าของหนังสือนิทานพากย์เสียงโดยเจ้าของภาษาอังกฤษ" */}
          <p className="font-sarabun text-center text-text-mid text-sm mt-1">
            ทุกบัตรคำและทุกหน้าของหนังสือนิทานพากย์เสียงโดยเจ้าของภาษาอังกฤษ
          </p>
        </div>
      </section>

      {/* ── SECTION 4 — WHAT'S INSIDE ────────────────────────────────────────── */}
      <section id="inside" className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark text-center mb-2">
          Everything your child needs in one place.
        </h2>
        {/* THAI: "ทุกอย่างที่ลูกต้องการในที่เดียว" */}
        <p className="font-sarabun text-text-mid text-center mb-4">ทุกอย่างที่ลูกต้องการในที่เดียว</p>
        <p className="text-text-mid text-center mb-10 max-w-xl mx-auto text-sm sm:text-base">
          Pick any subject and start. There is no fixed order — your child learns what interests them today.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard
            emoji="🃏"
            title="Flashcards"
            desc="Tap a card to hear the word spoken by a native English speaker. Swipe through entire subject decks or focus on words your child finds tricky."
          />
          <ContentCard
            emoji="📖"
            title="Read-along storybooks"
            desc="Illustrated ebooks where every word is highlighted as a native speaker reads aloud. Perfect for building listening and reading together."
          />
          <ContentCard
            emoji="🧠"
            title="Quizzes"
            desc="Picture quizzes and multiple-choice questions that reinforce what your child has learned — with instant feedback and encouraging scores."
          />
          <ContentCard
            emoji="🖨️"
            title="Printable worksheets"
            desc="Download and print activity sheets for offline practice. Great for screen-free learning time or homework reinforcement."
          />
          <ContentCard
            emoji="📝"
            title="Practice tests"
            desc="Timed tests that mirror real school entrance exam formats so your child builds confidence before the big day."
          />
          <div className="bg-gradient-to-br from-sky-dark to-[#00BCD4] rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-center gap-3">
            <p className="font-nunito font-black text-xl leading-snug">
              All content. One subscription.
            </p>
            {/* THAI: "เนื้อหาทั้งหมด สมัครครั้งเดียว" */}
            <p className="font-sarabun text-white/80 text-sm">เนื้อหาทั้งหมด สมัครครั้งเดียว</p>
            <Link
              href="/signup"
              className="inline-block bg-sun text-text-dark font-extrabold px-5 py-3 rounded-xl hover:bg-sun-dark transition-colors text-center text-sm mt-2"
            >
              Start free trial →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — SUBJECT GRID ─────────────────────────────────────────── */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark text-center mb-2">
            What your child will learn.
          </h2>
          {/* THAI: "สิ่งที่ลูกของคุณจะได้เรียนรู้" */}
          <p className="font-sarabun text-text-mid text-center mb-10">สิ่งที่ลูกของคุณจะได้เรียนรู้</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Ages 4–6 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-sky-dark text-white font-bold text-sm px-4 py-1.5 rounded-full mb-4">
                🌱 Ages 4–6
              </div>
              {/* THAI: "อายุ 4–6 ปี" */}
              <div className="flex flex-wrap gap-2">
                {[
                  "ABCs", "Phonics", "Numbers", "Colors", "Shapes",
                  "Animals", "Plants", "Food & Drink", "Body Parts",
                  "Five Senses", "Feelings", "Jobs", "Vehicles",
                  "Buildings", "Around the House", "At School",
                  "Practice Tests", "Interview Practice",
                ].map((s) => <SubjectPill key={s} label={s} />)}
              </div>
            </div>

            {/* Ages 6–8 */}
            <div>
              <div className="inline-flex items-center gap-2 bg-leaf text-white font-bold text-sm px-4 py-1.5 rounded-full mb-4">
                🚀 Ages 6–8
              </div>
              {/* THAI: "อายุ 6–8 ปี" */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Phonics Blending", "Prepositions", "Verbs",
                  "Hobbies", "Rhyming", "Comparisons", "Adjectives",
                  "Subject & Verb", "Tenses", "Read-along Stories",
                ].map((s) => <SubjectPill key={s} label={s} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — INTERVIEW PRACTICE ──────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <div className="bg-gradient-to-br from-coral/10 to-sun/20 rounded-3xl p-8 sm:p-12">
          <div className="text-4xl mb-4">🎤</div>
          <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark mb-2">
            Ready for the interview, not just the test.
          </h2>
          {/* THAI: "พร้อมสำหรับการสัมภาษณ์ ไม่ใช่แค่ข้อสอบ" */}
          <p className="font-sarabun text-text-mid mb-6">พร้อมสำหรับการสัมภาษณ์ ไม่ใช่แค่ข้อสอบ</p>
          <p className="text-text-mid leading-relaxed mb-4">
            Many Thai schools require a spoken English interview as part of their entrance process.
            English Allstars includes dedicated Interview Practice modules where your child hears
            real interview questions spoken by a native English speaker and practices answering
            out loud — so they walk into that room confident, not scared.
          </p>
          {/* THAI: "โรงเรียนไทยหลายแห่งกำหนดให้มีการสัมภาษณ์ภาษาอังกฤษเป็นส่วนหนึ่งของกระบวนการรับสมัคร English Allstars มีโมดูลฝึกสัมภาษณ์โดยเฉพาะ ให้ลูกได้ยินคำถามสัมภาษณ์จริงที่พากย์เสียงโดยเจ้าของภาษา และฝึกตอบออกเสียง — เพื่อให้เดินเข้าห้องสัมภาษณ์ด้วยความมั่นใจ ไม่ใช่ความกลัว" */}
          <p className="font-sarabun text-text-mid text-sm leading-relaxed">
            โรงเรียนไทยหลายแห่งกำหนดให้มีการสัมภาษณ์ภาษาอังกฤษเป็นส่วนหนึ่งของกระบวนการรับสมัคร English Allstars มีโมดูลฝึกสัมภาษณ์โดยเฉพาะ ให้ลูกได้ยินคำถามสัมภาษณ์จริงที่พากย์เสียงโดยเจ้าของภาษา และฝึกตอบออกเสียง — เพื่อให้เดินเข้าห้องสัมภาษณ์ด้วยความมั่นใจ ไม่ใช่ความกลัว
          </p>
        </div>
      </section>

      {/* ── SECTION 7 — PRICING ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-sky-dark/5 to-leaf/10 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark text-center mb-2">
            Simple, honest pricing.
          </h2>
          {/* THAI: "ราคาเรียบง่ายและโปร่งใส" */}
          <p className="font-sarabun text-text-mid text-center mb-2">ราคาเรียบง่ายและโปร่งใส</p>
          <p className="text-text-mid text-center text-sm mb-10">
            Less than one hour of private tutoring per month.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Family plan */}
            <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-sky-dark/20 flex flex-col">
              <div className="inline-block bg-sky-dark text-white text-xs font-bold px-3 py-1 rounded-full mb-4 self-start">
                FAMILY
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-black text-5xl text-text-dark font-nunito">฿750</span>
                <span className="text-text-mid font-semibold">/month</span>
              </div>
              {/* THAI: "ต่อเดือน" */}
              <p className="font-sarabun text-text-mid text-sm mb-5">ต่อเดือน</p>
              <ul className="space-y-3 mb-7 flex-1">
                <CheckItem>7-day free trial — no credit card needed</CheckItem>
                <CheckItem>All subjects and content types</CheckItem>
                <CheckItem>Multiple children on one account</CheckItem>
                <CheckItem>New content added regularly</CheckItem>
                <CheckItem>Cancel any time</CheckItem>
              </ul>
              <Link
                href="/signup"
                className="block bg-sky-dark text-white font-extrabold px-6 py-4 rounded-2xl hover:bg-[#01579B] transition-colors text-center"
              >
                {/* THAI: "เริ่มทดลองใช้ฟรี" */}
                Start free trial
              </Link>
            </div>

            {/* Tutor plan */}
            <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-leaf/20 flex flex-col">
              <div className="inline-block bg-leaf text-white text-xs font-bold px-3 py-1 rounded-full mb-4 self-start">
                TUTORS & SCHOOLS
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-black text-5xl text-text-dark font-nunito">฿250</span>
                <span className="text-text-mid font-semibold">/seat/month</span>
              </div>
              {/* THAI: "ต่อที่นั่งต่อเดือน" */}
              <p className="font-sarabun text-text-mid text-sm mb-5">ต่อที่นั่งต่อเดือน · ขั้นต่ำ 5 ที่นั่ง</p>
              <ul className="space-y-3 mb-7 flex-1">
                <CheckItem>Minimum 5 student seats</CheckItem>
                <CheckItem>All subjects and content types</CheckItem>
                <CheckItem>Per-student gradebook</CheckItem>
                <CheckItem>Track progress across your class</CheckItem>
                <CheckItem>Contact us for group discounts</CheckItem>
              </ul>
              <a
                href={CONTACT_LINK}
                className="block bg-leaf text-white font-extrabold px-6 py-4 rounded-2xl hover:bg-leaf-dark transition-colors text-center"
              >
                {/* THAI: "ติดต่อเรา" */}
                Contact us
              </a>
            </div>
          </div>

          {/* PromptPay note */}
          <p className="text-center text-text-mid text-sm mt-8">
            {/* THAI: "ชำระผ่าน PromptPay ได้ หรือติดต่อเราเพื่อวางบิลรายเดือน" */}
            Pay via PromptPay or contact us to arrange monthly invoicing.
          </p>
          <p className="font-sarabun text-center text-text-mid text-sm mt-1">
            ชำระผ่าน PromptPay ได้ หรือติดต่อเราเพื่อวางบิลรายเดือน
          </p>
        </div>
      </section>

      {/* ── SECTION 8 — FAQ ──────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <h2 className="font-nunito font-black text-2xl sm:text-3xl text-text-dark text-center mb-2">
          Questions? We have answers.
        </h2>
        {/* THAI: "มีคำถาม? เรามีคำตอบ" */}
        <p className="font-sarabun text-text-mid text-center mb-10">มีคำถาม? เรามีคำตอบ</p>

        <div className="space-y-4">
          {[
            {
              q: "What age is English Allstars for?",
              // THAI: "English Allstars เหมาะสำหรับเด็กอายุเท่าไหร่?"
              a: "The content is designed for children ages 4–8. Younger children (4–6) focus on vocabulary, phonics, and listening. Older children (6–8) move into grammar patterns, blending, tenses, and reading.",
            },
            {
              q: "How much time per day should my child spend on it?",
              // THAI: "ลูกควรใช้เวลากับแอปนี้วันละเท่าไหร่?"
              a: "Even 10–15 minutes a day is enough to make real progress. The app is built for short, focused sessions — a few flashcards here, a quick quiz there. Consistency matters far more than length.",
            },
            {
              q: "Can more than one child use the same account?",
              // THAI: "เด็กหลายคนใช้บัญชีเดียวกันได้ไหม?"
              a: "Yes. The Family plan supports multiple children under a single subscription. Each child gets their own profile and progress tracking.",
            },
            {
              q: "What if I want to cancel?",
              // THAI: "ถ้าอยากยกเลิกต้องทำอย่างไร?"
              a: "You can cancel your subscription at any time from your account settings. There are no cancellation fees and no questions asked.",
            },
            {
              q: "Can I pay with PromptPay?",
              // THAI: "ชำระด้วย PromptPay ได้ไหม?"
              a: "Yes — just contact us and we will send you a monthly PromptPay QR code. This is our most popular payment method for Thai families.",
            },
            {
              q: "Does my child need to be able to read Thai first?",
              // THAI: "ลูกต้องอ่านภาษาไทยได้ก่อนไหม?"
              a: "No. The app teaches English through pictures, audio, and simple words. Children who cannot yet read Thai (or English) can still use flashcards, storybooks, and picture quizzes by listening and watching.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-nunito font-bold text-text-dark hover:bg-cream/50 transition-colors">
                <span>{q}</span>
                <span className="text-sky-dark text-xl font-black flex-shrink-0 group-open:rotate-45 transition-transform duration-200">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 text-text-mid text-sm sm:text-base leading-relaxed border-t border-gray-50 pt-4">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── SECTION 9 — FINAL CTA ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1565C0] via-sky-dark to-[#00BCD4] text-white">
        {/* wave top */}
        <div className="relative h-16 overflow-hidden -mb-1">
          <svg viewBox="0 0 1440 64" className="absolute top-0 w-full" preserveAspectRatio="none">
            <path d="M0,32 C360,0 1080,64 1440,32 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="text-5xl mb-6">⭐</div>
          <h2 className="font-nunito font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4">
            Start today.
          </h2>
          <p className="text-xl sm:text-2xl opacity-90 max-w-xl mx-auto mb-2">
            Your child can be learning their first ten English words in the next ten minutes.
          </p>
          {/* THAI: "ลูกของคุณสามารถเริ่มเรียนคำศัพท์อังกฤษสิบคำแรกได้ภายในสิบนาทีข้างหน้า" */}
          <p className="font-sarabun text-white/80 text-base max-w-xl mx-auto mb-10">
            ลูกของคุณสามารถเริ่มเรียนคำศัพท์อังกฤษสิบคำแรกได้ภายในสิบนาทีข้างหน้า
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-block bg-sun text-text-dark font-extrabold text-xl px-10 py-5 rounded-2xl hover:bg-sun-dark transition-colors shadow-xl w-full sm:w-auto text-center"
            >
              {/* THAI: "เริ่มทดลองใช้ฟรี 7 วัน" */}
              Start your 7-day free trial
            </Link>
          </div>

          <p className="mt-8 text-sm opacity-70">
            Questions?{" "}
            <a href={CONTACT_LINK} className="underline hover:opacity-100 transition-opacity">
              {CONTACT_LABEL}
            </a>
          </p>
          {/* THAI: "มีคำถาม? ติดต่อเรา" */}
          <p className="font-sarabun text-sm opacity-60 mt-1">
            มีคำถาม?{" "}
            <a href={CONTACT_LINK} className="underline">
              ติดต่อเรา
            </a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-text-dark text-white/60 text-xs text-center py-6 px-4 space-y-1">
        <p className="font-nunito">
          © {new Date().getFullYear()} English Allstars ·{" "}
          <a href={CONTACT_LINK} className="hover:text-white transition-colors">
            {CONTACT_LABEL}
          </a>
        </p>
        <p>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
