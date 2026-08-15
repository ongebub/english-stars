import type { Metadata } from "next";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | Privacy Policy — English Allstars",
  description:
    "นโยบายความเป็นส่วนตัวของ English Allstars — Privacy Policy for English Allstars.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/login" className="text-sky-dark text-sm font-semibold hover:underline">
          &larr; Back / กลับ
        </Link>

        <h1 className="font-nunito text-3xl font-extrabold text-text-dark mt-6 mb-2">
          Privacy Policy
        </h1>
        <p className="font-sarabun text-text-mid mb-8">นโยบายความเป็นส่วนตัว</p>

        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 text-text-dark text-sm leading-relaxed">

          <p className="text-text-mid text-xs">Effective date: August 15, 2026 / วันที่มีผลบังคับใช้: 15 สิงหาคม 2569</p>

          <div className="bg-sun/20 border-2 border-sun rounded-xl p-4 text-xs text-text-dark">
            <p className="font-bold mb-1">Disclaimer / ข้อจำกัดความรับผิดชอบ</p>
            <p>This privacy policy is provided for informational purposes and does not constitute legal advice. English Allstars LLC recommends that you consult with a qualified attorney before relying on this document.</p>
            <p className="font-sarabun mt-1">นโยบายความเป็นส่วนตัวนี้จัดทำขึ้นเพื่อวัตถุประสงค์ในการให้ข้อมูลเท่านั้น ไม่ถือเป็นคำแนะนำทางกฎหมาย English Allstars LLC แนะนำให้ปรึกษาทนายความที่มีคุณสมบัติเหมาะสมก่อนใช้เอกสารนี้</p>
          </div>

          {/* 1. Data Controller */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">1. Data Controller / ผู้ควบคุมข้อมูล</h2>
            <p>English Allstars LLC, an Iowa limited liability company, is the data controller responsible for your personal data collected through the English Allstars platform (&quot;the Service&quot;).</p>
            <p className="font-sarabun text-text-mid mt-2">English Allstars LLC บริษัทจำกัดความรับผิดชอบในรัฐไอโอวา สหรัฐอเมริกา เป็นผู้ควบคุมข้อมูลที่รับผิดชอบข้อมูลส่วนบุคคลของคุณที่รวบรวมผ่านแพลตฟอร์ม English Allstars (&quot;บริการ&quot;)</p>
          </section>

          {/* 2. What We Collect */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">2. Information We Collect / ข้อมูลที่เรารวบรวม</h2>
            <p>We collect the following categories of personal data:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Account information:</strong> email address used for registration and login.</li>
              <li><strong>Subscription and billing status:</strong> your subscription tier and payment status. All payment processing is handled by Stripe; we do not store your credit card details.</li>
              <li><strong>Child profile data:</strong> display names and ages of child profiles created under your account.</li>
              <li><strong>Learning progress:</strong> quiz scores, lesson completion, and activity history for each child profile.</li>
              <li><strong>Device and usage data:</strong> device fingerprint (a hash used for session management and security), browser type, and general usage patterns.</li>
            </ul>
            <p className="font-sarabun text-text-mid mt-3">เรารวบรวมข้อมูลส่วนบุคคลในหมวดหมู่ต่อไปนี้:</p>
            <ul className="font-sarabun text-text-mid list-disc list-inside mt-1 space-y-1">
              <li><strong>ข้อมูลบัญชี:</strong> อีเมลที่ใช้สำหรับลงทะเบียนและเข้าสู่ระบบ</li>
              <li><strong>สถานะการสมัครสมาชิกและการเรียกเก็บเงิน:</strong> ระดับการสมัครสมาชิกและสถานะการชำระเงิน การประมวลผลการชำระเงินทั้งหมดดำเนินการโดย Stripe เราไม่เก็บรายละเอียดบัตรเครดิตของคุณ</li>
              <li><strong>ข้อมูลโปรไฟล์เด็ก:</strong> ชื่อที่แสดงและอายุของโปรไฟล์เด็กที่สร้างภายใต้บัญชีของคุณ</li>
              <li><strong>ความก้าวหน้าในการเรียนรู้:</strong> คะแนนแบบทดสอบ การเรียนบทเรียนจนจบ และประวัติกิจกรรมของแต่ละโปรไฟล์เด็ก</li>
              <li><strong>ข้อมูลอุปกรณ์และการใช้งาน:</strong> ลายนิ้วมืออุปกรณ์ (แฮชที่ใช้สำหรับการจัดการเซสชันและความปลอดภัย) ประเภทเบราว์เซอร์ และรูปแบบการใช้งานทั่วไป</li>
            </ul>
          </section>

          {/* 3. Why We Collect */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">3. Purpose of Collection / วัตถุประสงค์ในการรวบรวม</h2>
            <p>We use your data for the following purposes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>To provide and operate the Service, including user authentication and session management.</li>
              <li>To track each child&apos;s learning progress and display it to the account holder.</li>
              <li>To process subscriptions and manage billing through Stripe.</li>
              <li>To improve our educational content and user experience.</li>
              <li>To enforce device limitations and prevent unauthorized account sharing.</li>
            </ul>
            <p className="font-sarabun text-text-mid mt-3">เราใช้ข้อมูลของคุณเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
            <ul className="font-sarabun text-text-mid list-disc list-inside mt-1 space-y-1">
              <li>เพื่อให้บริการและดำเนินการบริการ รวมถึงการยืนยันตัวตนผู้ใช้และการจัดการเซสชัน</li>
              <li>เพื่อติดตามความก้าวหน้าในการเรียนรู้ของเด็กแต่ละคนและแสดงให้เจ้าของบัญชีเห็น</li>
              <li>เพื่อประมวลผลการสมัครสมาชิกและจัดการการเรียกเก็บเงินผ่าน Stripe</li>
              <li>เพื่อปรับปรุงเนื้อหาการศึกษาและประสบการณ์ผู้ใช้ของเรา</li>
              <li>เพื่อบังคับใช้ข้อจำกัดอุปกรณ์และป้องกันการแชร์บัญชีโดยไม่ได้รับอนุญาต</li>
            </ul>
          </section>

          {/* 4. Children's Data */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">4. Children&apos;s Data / ข้อมูลของเด็ก</h2>
            <p>Children do not create their own accounts. All accounts are created and controlled by a parent, legal guardian, or tutor. Child profiles are created by the account holder and contain only a display name, age, and learning progress data. Child profile data is visible only to the account holder and any tutors linked to the child&apos;s profile. We do not collect email addresses or other contact information from children.</p>
            <p className="font-sarabun text-text-mid mt-2">เด็กไม่สามารถสร้างบัญชีของตนเองได้ บัญชีทั้งหมดสร้างและควบคุมโดยผู้ปกครอง ผู้พิทักษ์ตามกฎหมาย หรือติวเตอร์ โปรไฟล์เด็กสร้างโดยเจ้าของบัญชีและมีเพียงชื่อที่แสดง อายุ และข้อมูลความก้าวหน้าในการเรียนรู้ ข้อมูลโปรไฟล์เด็กจะมองเห็นได้เฉพาะเจ้าของบัญชีและติวเตอร์ที่เชื่อมโยงกับโปรไฟล์ของเด็กเท่านั้น เราไม่รวบรวมอีเมลหรือข้อมูลติดต่ออื่นๆ จากเด็ก</p>
          </section>

          {/* 5. Third-Party Services */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">5. Third-Party Services / บริการของบุคคลที่สาม</h2>
            <p>We use the following third-party services to operate the platform:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Stripe</strong> — payment processing. Stripe collects and processes payment information under its own privacy policy.</li>
              <li><strong>Supabase</strong> — database hosting and user authentication.</li>
              <li><strong>Vercel</strong> — website hosting and delivery.</li>
              <li><strong>ElevenLabs</strong> — text-to-speech audio generation for educational content.</li>
              <li><strong>Higgsfield</strong> — AI image generation for educational illustrations.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to any third party. Data shared with these services is limited to what is necessary to provide the Service.</p>
            <p className="font-sarabun text-text-mid mt-3">เราใช้บริการของบุคคลที่สามต่อไปนี้เพื่อดำเนินการแพลตฟอร์ม:</p>
            <ul className="font-sarabun text-text-mid list-disc list-inside mt-1 space-y-1">
              <li><strong>Stripe</strong> — การประมวลผลการชำระเงิน Stripe รวบรวมและประมวลผลข้อมูลการชำระเงินภายใต้นโยบายความเป็นส่วนตัวของตนเอง</li>
              <li><strong>Supabase</strong> — โฮสติ้งฐานข้อมูลและการยืนยันตัวตนผู้ใช้</li>
              <li><strong>Vercel</strong> — โฮสติ้งเว็บไซต์และการจัดส่ง</li>
              <li><strong>ElevenLabs</strong> — การสร้างเสียงอ่านสำหรับเนื้อหาการศึกษา</li>
              <li><strong>Higgsfield</strong> — การสร้างภาพ AI สำหรับภาพประกอบการศึกษา</li>
            </ul>
            <p className="font-sarabun text-text-mid mt-2">เราไม่ขายข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สามใดๆ ข้อมูลที่แบ่งปันกับบริการเหล่านี้จำกัดเฉพาะสิ่งที่จำเป็นในการให้บริการ</p>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">6. Data Retention / การเก็บรักษาข้อมูล</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide the Service.</p>
            <p className="mt-2"><strong>Removing a child or student profile.</strong> If you remove an individual profile without deleting your account, we keep that profile and its learning progress for 12 months from the date of removal so that you can restore it. After 12 months it is permanently deleted.</p>
            <p className="mt-2"><strong>Cancelled or lapsed subscriptions.</strong> If your subscription is cancelled or lapses, your child profiles and their learning progress are retained on the same 12-month clock, so you can resume later without losing your child&apos;s history.</p>
            <p className="mt-2"><strong>Deleting your data.</strong> Asking us to delete your account and personal data is a separate action from removing a profile. It is honoured immediately and permanently, and is <em>not</em> subject to the 12-month window. The only exception is records we are required by law to keep, such as billing records.</p>
            <p className="mt-2">Anonymous, aggregated data that cannot identify you may be retained indefinitely for analytics and content improvement.</p>
            <p className="font-sarabun text-text-mid mt-4">เราเก็บรักษาข้อมูลส่วนบุคคลของคุณตราบเท่าที่บัญชีของคุณยังใช้งานอยู่หรือตามที่จำเป็นเพื่อให้บริการ</p>
            <p className="font-sarabun text-text-mid mt-2"><strong>การลบโปรไฟล์เด็กหรือนักเรียน</strong> หากคุณลบโปรไฟล์รายบุคคลออกโดยไม่ได้ลบบัญชีทั้งหมด เราจะเก็บรักษาโปรไฟล์นั้นพร้อมความคืบหน้าการเรียนไว้เป็นเวลา 12 เดือนนับจากวันที่ลบ เพื่อให้คุณสามารถกู้คืนได้ หลังจากครบ 12 เดือน ข้อมูลดังกล่าวจะถูกลบอย่างถาวร</p>
            <p className="font-sarabun text-text-mid mt-2"><strong>การยกเลิกหรือหมดอายุการสมัครสมาชิก</strong> หากการสมัครสมาชิกของคุณถูกยกเลิกหรือหมดอายุ โปรไฟล์เด็กและความคืบหน้าการเรียนจะถูกเก็บรักษาไว้ตามระยะเวลา 12 เดือนเช่นเดียวกัน เพื่อให้คุณกลับมาใช้งานต่อได้โดยไม่สูญเสียประวัติการเรียนของลูก</p>
            <p className="font-sarabun text-text-mid mt-2"><strong>การขอลบข้อมูลของคุณ</strong> การขอให้เราลบบัญชีและข้อมูลส่วนบุคคลของคุณเป็นคนละขั้นตอนกับการลบโปรไฟล์ เราจะดำเนินการทันทีและอย่างถาวร และ<em>ไม่</em>อยู่ภายใต้ระยะเวลา 12 เดือน ยกเว้นบันทึกที่กฎหมายกำหนดให้เราต้องเก็บรักษา เช่น บันทึกการเรียกเก็บเงิน</p>
            <p className="font-sarabun text-text-mid mt-2">ข้อมูลที่ไม่ระบุตัวตนและรวมกลุ่มที่ไม่สามารถระบุตัวคุณได้อาจถูกเก็บรักษาไว้อย่างไม่มีกำหนดเพื่อการวิเคราะห์และปรับปรุงเนื้อหา</p>
          </section>

          {/* 7. Your Rights under PDPA */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">7. Your Rights (Thailand PDPA) / สิทธิ์ของคุณ (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)</h2>
            <p>If you are located in Thailand, you have the following rights under the Personal Data Protection Act (PDPA):</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Right of access:</strong> You may request a copy of the personal data we hold about you.</li>
              <li><strong>Right to correction:</strong> You may request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Right to deletion:</strong> You may request that we delete your personal data, subject to legal retention requirements.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, you may withdraw that consent at any time.</li>
              <li><strong>Right to data portability:</strong> You may request your data in a structured, commonly used format.</li>
              <li><strong>Right to object:</strong> You may object to certain types of data processing.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, please contact us at the email address listed in Section 10 below.</p>
            <p className="font-sarabun text-text-mid mt-3">หากคุณอยู่ในประเทศไทย คุณมีสิทธิ์ดังต่อไปนี้ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA):</p>
            <ul className="font-sarabun text-text-mid list-disc list-inside mt-1 space-y-1">
              <li><strong>สิทธิ์ในการเข้าถึง:</strong> คุณสามารถขอสำเนาข้อมูลส่วนบุคคลที่เราเก็บเกี่ยวกับคุณ</li>
              <li><strong>สิทธิ์ในการแก้ไข:</strong> คุณสามารถขอให้เราแก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์</li>
              <li><strong>สิทธิ์ในการลบ:</strong> คุณสามารถขอให้เราลบข้อมูลส่วนบุคคลของคุณ โดยขึ้นอยู่กับข้อกำหนดการเก็บรักษาตามกฎหมาย</li>
              <li><strong>สิทธิ์ในการถอนความยินยอม:</strong> ในกรณีที่การประมวลผลขึ้นอยู่กับความยินยอม คุณสามารถถอนความยินยอมได้ตลอดเวลา</li>
              <li><strong>สิทธิ์ในการโอนย้ายข้อมูล:</strong> คุณสามารถขอข้อมูลของคุณในรูปแบบที่มีโครงสร้างและใช้กันทั่วไป</li>
              <li><strong>สิทธิ์ในการคัดค้าน:</strong> คุณสามารถคัดค้านการประมวลผลข้อมูลบางประเภท</li>
            </ul>
            <p className="font-sarabun text-text-mid mt-2">หากต้องการใช้สิทธิ์เหล่านี้ กรุณาติดต่อเราที่อีเมลที่ระบุไว้ในข้อ 10 ด้านล่าง</p>
          </section>

          {/* 8. Cookies & Local Storage */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">8. Cookies & Local Storage / คุกกี้และที่เก็บข้อมูลในเครื่อง</h2>
            <p>We use cookies and browser local storage for the following purposes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Authentication cookies:</strong> to keep you logged in and verify trusted devices.</li>
              <li><strong>Theme preference:</strong> your light/dark mode choice is stored locally so it persists between visits.</li>
              <li><strong>Tutorial state:</strong> progress through in-app tutorials is stored locally so you are not shown completed tutorials again.</li>
              <li><strong>Active profile:</strong> your selected child profile is stored locally for convenience.</li>
              <li><strong>Playback speed:</strong> your preferred audio speed for ebooks and flashcards is stored locally.</li>
            </ul>
            <p className="mt-2">We do not use third-party tracking cookies or advertising cookies.</p>
            <p className="font-sarabun text-text-mid mt-3">เราใช้คุกกี้และที่เก็บข้อมูลในเบราว์เซอร์เพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
            <ul className="font-sarabun text-text-mid list-disc list-inside mt-1 space-y-1">
              <li><strong>คุกกี้การยืนยันตัวตน:</strong> เพื่อให้คุณเข้าสู่ระบบอยู่และยืนยันอุปกรณ์ที่เชื่อถือได้</li>
              <li><strong>การตั้งค่าธีม:</strong> ตัวเลือกโหมดสว่าง/มืดของคุณถูกเก็บไว้ในเครื่องเพื่อให้คงอยู่ระหว่างการเยี่ยมชม</li>
              <li><strong>สถานะบทช่วยสอน:</strong> ความก้าวหน้าในบทช่วยสอนในแอปถูกเก็บไว้ในเครื่องเพื่อไม่ให้แสดงบทช่วยสอนที่เสร็จสิ้นแล้วซ้ำ</li>
              <li><strong>โปรไฟล์ที่ใช้งาน:</strong> โปรไฟล์เด็กที่เลือกถูกเก็บไว้ในเครื่องเพื่อความสะดวก</li>
              <li><strong>ความเร็วการเล่น:</strong> ความเร็วเสียงที่คุณต้องการสำหรับอีบุ๊คและแฟลชการ์ดถูกเก็บไว้ในเครื่อง</li>
            </ul>
            <p className="font-sarabun text-text-mid mt-2">เราไม่ใช้คุกกี้ติดตามของบุคคลที่สามหรือคุกกี้โฆษณา</p>
          </section>

          {/* 9. Changes to This Policy */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">9. Changes to This Policy / การเปลี่ยนแปลงนโยบายนี้</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the Service. The &quot;Effective date&quot; at the top of this page indicates when the policy was last updated. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.</p>
            <p className="font-sarabun text-text-mid mt-2">เราอาจอัปเดตนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว เราจะแจ้งให้คุณทราบถึงการเปลี่ยนแปลงที่สำคัญทางอีเมลหรือผ่านบริการ &quot;วันที่มีผลบังคับใช้&quot; ที่ด้านบนของหน้านี้ระบุว่านโยบายได้รับการอัปเดตครั้งล่าสุดเมื่อใด การใช้บริการต่อไปหลังจากมีการโพสต์การเปลี่ยนแปลงถือเป็นการยอมรับนโยบายที่อัปเดต</p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">10. Contact Us / ติดต่อเรา</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at:{" "}
              <a href="mailto:info@englishallstars.com" className="text-sky-dark hover:underline">
                info@englishallstars.com
              </a>
            </p>
            <p className="font-sarabun text-text-mid mt-2">
              หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้หรือต้องการใช้สิทธิ์ข้อมูลของคุณ กรุณาติดต่อเราที่:{" "}
              <a href="mailto:info@englishallstars.com" className="text-sky-dark hover:underline">
                info@englishallstars.com
              </a>
            </p>
          </section>

        </div>

        <AppFooter />
      </div>
    </div>
  );
}
