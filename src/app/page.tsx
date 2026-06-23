import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1565C0] via-sky-dark to-[#26C6DA] px-6 py-12 pb-20 text-white"
        style={{ borderRadius: "0 0 40px 40px" }}>
        <div className="absolute -top-20 -right-16 w-72 h-72 bg-white/[0.07] rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/[0.05] rounded-full" />
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="text-6xl mb-4 animate-bounce">🦉</div>
          <h1 className="text-4xl font-black mb-2">English Stars</h1>
          <p className="font-sarabun text-lg opacity-90 mb-1">เรียนภาษาอังกฤษสนุกๆ</p>
          <p className="text-sm opacity-80 mb-6">Prepare your child for English school entrance exams</p>
          <p className="font-sarabun text-sm opacity-80 mb-8">เตรียมความพร้อมสำหรับการสอบเข้าโรงเรียนภาษาอังกฤษ</p>
          <Link href="/login"
            className="inline-block bg-sun text-text-dark font-extrabold text-lg px-8 py-4 rounded-xl hover:bg-sun-dark transition-colors shadow-lg">
            เริ่มเลย / Start Now ⭐
          </Link>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-lg mx-auto px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-2 gap-4">
          {[
            { emoji: "🃏", title: "Flashcards", titleTh: "บัตรคำศัพท์" },
            { emoji: "📖", title: "E-books", titleTh: "หนังสืออิเล็กทรอนิกส์" },
            { emoji: "🧠", title: "Quizzes", titleTh: "แบบทดสอบ" },
            { emoji: "📊", title: "Progress", titleTh: "ติดตามความก้าวหน้า" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-5 shadow-md text-center">
              <div className="text-3xl mb-2">{f.emoji}</div>
              <p className="font-bold text-text-dark text-sm">{f.title}</p>
              <p className="font-sarabun text-xs text-text-mid">{f.titleTh}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Your Child Will Learn */}
      <section className="max-w-lg mx-auto px-6 mt-12">
        <h2 className="text-2xl font-extrabold text-center text-text-dark mb-2">What Your Child Will Learn</h2>
        <p className="font-sarabun text-center text-text-mid mb-6">สิ่งที่ลูกของคุณจะได้เรียนรู้</p>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {["🔤 ABCs", "🔊 Phonics", "🔢 Numbers", "🎨 Colors", "🔷 Shapes", "🐾 Animals",
              "🍎 Food", "😊 Emotions", "👨‍⚕️ Jobs", "🚗 Vehicles", "🏠 Home", "📖 Stories"
            ].map((item) => (
              <div key={item} className="bg-cream rounded-lg py-2 px-1 font-semibold text-text-dark">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-lg mx-auto px-6 mt-12">
        <h2 className="text-2xl font-extrabold text-center text-text-dark mb-2">Pricing / ราคา</h2>
        <div className="bg-white rounded-xl p-6 shadow-md text-center">
          <div className="text-4xl font-black text-sky-dark mb-1">฿750</div>
          <p className="text-text-mid font-semibold">/month · ต่อเดือน</p>
          <p className="text-sm text-text-light mt-2">Annual discount coming soon · ส่วนลดรายปีเร็วๆ นี้</p>
          <ul className="text-left mt-4 space-y-2 text-sm text-text-dark">
            {[
              "All subjects & modules · ทุกวิชาและโมดูล",
              "Unlimited quizzes · ทำแบบทดสอบไม่จำกัด",
              "Parent gradebook · สมุดพกผู้ปกครอง",
              "New content monthly · เนื้อหาใหม่ทุกเดือน",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-leaf">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link href="/login"
            className="mt-6 inline-block bg-leaf text-white font-bold px-6 py-3 rounded-xl hover:bg-leaf-dark transition-colors w-full">
            Subscribe Now · สมัครเลย
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="max-w-lg mx-auto px-6 mt-12 mb-12">
        <div className="bg-white rounded-xl p-6 shadow-md text-center">
          <p className="text-sm text-text-mid">
            Developed by a native English speaker &amp; Thai university English faculty
          </p>
          <p className="font-sarabun text-sm text-text-light mt-1">
            พัฒนาโดยเจ้าของภาษาอังกฤษ และอาจารย์ภาษาอังกฤษมหาวิทยาลัยไทย
          </p>
        </div>
      </section>
    </div>
  );
}
