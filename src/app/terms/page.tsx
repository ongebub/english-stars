import type { Metadata } from "next";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "ข้อกำหนดการใช้งาน | Terms of Service — English Allstars",
  description:
    "ข้อกำหนดการใช้งานของ English Allstars — Terms of Service for English Allstars.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/login" className="text-sky-dark text-sm font-semibold hover:underline">
          &larr; Back / กลับ
        </Link>

        <h1 className="font-nunito text-3xl font-extrabold text-text-dark mt-6 mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="font-sarabun text-text-mid mb-8">ข้อกำหนดและเงื่อนไข</p>

        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 text-text-dark text-sm leading-relaxed">

          <p className="text-text-mid text-xs">Last updated: July 11, 2026 / อัปเดตล่าสุด: 11 กรกฎาคม 2569</p>

          <div className="bg-sun/20 border-2 border-sun rounded-xl p-4 text-xs text-text-dark">
            <p className="font-bold mb-1">Disclaimer / ข้อจำกัดความรับผิดชอบ</p>
            <p>These terms and conditions are provided for informational purposes and do not constitute legal advice. English Allstars LLC recommends that you consult with a qualified attorney before relying on this document.</p>
            <p className="font-sarabun mt-1">ข้อกำหนดและเงื่อนไขนี้จัดทำขึ้นเพื่อวัตถุประสงค์ในการให้ข้อมูลเท่านั้น ไม่ถือเป็นคำแนะนำทางกฎหมาย English Allstars LLC แนะนำให้ปรึกษาทนายความที่มีคุณสมบัติเหมาะสมก่อนใช้เอกสารนี้</p>
          </div>

          {/* 1. Acceptance of Terms */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">1. Acceptance of Terms / การยอมรับข้อกำหนด</h2>
            <p>By creating an account on English Allstars (&quot;the Service&quot;), you agree to be bound by these Terms &amp; Conditions. If you do not agree, you may not use the Service. If you are creating an account on behalf of a minor, you represent that you are the parent or legal guardian of that minor and accept these terms on their behalf.</p>
            <p className="font-sarabun text-text-mid mt-2">การสร้างบัญชีบน English Allstars (&quot;บริการ&quot;) ถือว่าคุณตกลงที่จะผูกพันตามข้อกำหนดและเงื่อนไขเหล่านี้ หากคุณไม่ยอมรับ คุณไม่สามารถใช้บริการได้ หากคุณสร้างบัญชีในนามของผู้เยาว์ คุณรับรองว่าคุณเป็นบิดามารดาหรือผู้ปกครองตามกฎหมายของผู้เยาว์นั้น และยอมรับข้อกำหนดเหล่านี้ในนามของพวกเขา</p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">2. Description of Service / คำอธิบายบริการ</h2>
            <p>English Allstars is an online English language learning platform designed for children, offering interactive ebooks, flashcards, quizzes, and other educational content. The Service is operated by English Allstars LLC.</p>
            <p className="font-sarabun text-text-mid mt-2">English Allstars เป็นแพลตฟอร์มการเรียนรู้ภาษาอังกฤษออนไลน์ที่ออกแบบมาสำหรับเด็ก โดยมีอีบุ๊คเชิงโต้ตอบ แฟลชการ์ด แบบทดสอบ และเนื้อหาการศึกษาอื่นๆ บริการนี้ดำเนินการโดย English Allstars LLC</p>
          </section>

          {/* 3. User Accounts */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">3. User Accounts / บัญชีผู้ใช้</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account. Accounts are for individual family or school use only and may not be shared with other families or institutions.</p>
            <p className="font-sarabun text-text-mid mt-2">คุณต้องให้ข้อมูลที่ถูกต้องและครบถ้วนเมื่อสร้างบัญชี คุณมีหน้าที่รับผิดชอบในการรักษาความลับของข้อมูลรับรองบัญชีของคุณและกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของคุณ คุณต้องแจ้งให้เราทราบทันทีหากมีการใช้บัญชีของคุณโดยไม่ได้รับอนุญาต บัญชีมีไว้สำหรับการใช้งานของครอบครัวหรือโรงเรียนเฉพาะรายเท่านั้น และห้ามแบ่งปันกับครอบครัวหรือสถาบันอื่น</p>
          </section>

          {/* 4. Children's Privacy */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">4. Children&apos;s Privacy (COPPA Compliance) / ความเป็นส่วนตัวของเด็ก (การปฏิบัติตาม COPPA)</h2>
            <p>We comply with the Children&apos;s Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 without verifiable parental consent. Parent or guardian accounts are required to create child profiles. Child profiles do not require email addresses. We collect only the minimum information necessary to provide the educational service (display name, learning progress, and quiz scores). Parents may review, modify, or delete their child&apos;s information at any time through the Dashboard.</p>
            <p className="font-sarabun text-text-mid mt-2">เราปฏิบัติตามพระราชบัญญัติคุ้มครองความเป็นส่วนตัวออนไลน์ของเด็ก (Children&apos;s Online Privacy Protection Act หรือ COPPA) เราจะไม่รวบรวมข้อมูลส่วนบุคคลจากเด็กอายุต่ำกว่า 13 ปีโดยเจตนา โดยไม่ได้รับความยินยอมจากผู้ปกครองที่ตรวจสอบได้ จำเป็นต้องมีบัญชีผู้ปกครองหรือผู้พิทักษ์เพื่อสร้างโปรไฟล์เด็ก โปรไฟล์เด็กไม่จำเป็นต้องมีอีเมล เรารวบรวมเฉพาะข้อมูลขั้นต่ำที่จำเป็นในการให้บริการการศึกษา (ชื่อที่แสดง ความก้าวหน้าในการเรียนรู้ และคะแนนแบบทดสอบ) ผู้ปกครองสามารถตรวจสอบ แก้ไข หรือลบข้อมูลของบุตรหลานได้ตลอดเวลาผ่านแดชบอร์ด</p>
          </section>

          {/* 5. Subscription & Payments */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">5. Subscription &amp; Payments / การสมัครสมาชิกและการชำระเงิน</h2>
            <p>Certain features require a paid subscription. Subscription fees are charged on a recurring basis as specified at the time of purchase. You may cancel your subscription at any time through your Dashboard. Cancellation takes effect at the end of the current billing period. Refund requests are handled on a case-by-case basis. Please contact info@englishallstars.com for refund inquiries.</p>
            <p className="font-sarabun text-text-mid mt-2">ฟีเจอร์บางอย่างต้องสมัครสมาชิกแบบชำระเงิน ค่าสมัครสมาชิกจะถูกเรียกเก็บแบบต่อเนื่องตามที่ระบุไว้ ณ เวลาที่ซื้อ คุณสามารถยกเลิกการสมัครสมาชิกได้ตลอดเวลาผ่านแดชบอร์ด การยกเลิกจะมีผลเมื่อสิ้นสุดรอบการเรียกเก็บเงินปัจจุบัน คำขอคืนเงินจะพิจารณาเป็นรายกรณี กรุณาติดต่อ info@englishallstars.com สำหรับการสอบถามเรื่องการคืนเงิน</p>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">6. Intellectual Property / ทรัพย์สินทางปัญญา</h2>
            <p>All content on English Allstars, including but not limited to text, images, illustrations, audio recordings, animations, software code, and educational materials, is the exclusive property of English Allstars LLC and is protected by copyright, trademark, and other intellectual property laws. You may not copy, reproduce, distribute, modify, display, perform, or create derivative works from any content without prior written permission from English Allstars LLC.</p>
            <p className="font-sarabun text-text-mid mt-2">เนื้อหาทั้งหมดบน English Allstars รวมถึงแต่ไม่จำกัดเพียงข้อความ รูปภาพ ภาพประกอบ การบันทึกเสียง แอนิเมชัน โค้ดซอฟต์แวร์ และสื่อการศึกษา เป็นทรัพย์สินเฉพาะของ English Allstars LLC และได้รับความคุ้มครองภายใต้กฎหมายลิขสิทธิ์ เครื่องหมายการค้า และกฎหมายทรัพย์สินทางปัญญาอื่นๆ คุณไม่สามารถคัดลอก ทำซ้ำ แจกจ่าย ดัดแปลง แสดง เผยแพร่ หรือสร้างงานดัดแปลง (Derivative Works) จากเนื้อหาใดๆ โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจาก English Allstars LLC</p>
          </section>

          {/* 7. Acceptable Use */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">7. Acceptable Use / การใช้งานที่ยอมรับได้</h2>
            <p>You agree not to: (a) share your account credentials with unauthorized parties; (b) use the Service for any unlawful purpose; (c) attempt to access the Service through automated means (bots, scrapers, etc.); (d) reverse engineer, decompile, or disassemble any part of the Service; (e) interfere with or disrupt the Service or its servers; (f) upload or transmit any harmful content. We reserve the right to suspend or terminate accounts that violate these terms.</p>
            <p className="font-sarabun text-text-mid mt-2">คุณตกลงที่จะไม่: (ก) แบ่งปันข้อมูลรับรองบัญชีของคุณกับบุคคลที่ไม่ได้รับอนุญาต; (ข) ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย; (ค) พยายามเข้าถึงบริการผ่านวิธีการอัตโนมัติ (บอท สแครปเปอร์ ฯลฯ); (ง) ทำวิศวกรรมย้อนกลับ (Reverse Engineer) ถอดรหัส หรือแยกส่วนใดๆ ของบริการ; (จ) แทรกแซงหรือขัดขวางบริการหรือเซิร์ฟเวอร์; (ฉ) อัปโหลดหรือส่งเนื้อหาที่เป็นอันตราย เราขอสงวนสิทธิ์ในการระงับหรือยุติบัญชีที่ละเมิดข้อกำหนดเหล่านี้</p>
          </section>

          {/* 8. Device Limitations */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">8. Device Limitations / ข้อจำกัดอุปกรณ์</h2>
            <p>To prevent unauthorized sharing, each child profile may be actively used on a maximum of two (2) devices simultaneously. If a third device is used, the oldest active session will be automatically terminated. New devices may require email verification for security purposes.</p>
            <p className="font-sarabun text-text-mid mt-2">เพื่อป้องกันการแชร์โดยไม่ได้รับอนุญาต โปรไฟล์เด็กแต่ละโปรไฟล์สามารถใช้งานพร้อมกันได้สูงสุดสอง (2) อุปกรณ์ หากมีการใช้อุปกรณ์ที่สาม เซสชันที่เก่าที่สุดจะถูกยุติโดยอัตโนมัติ อุปกรณ์ใหม่อาจต้องมีการยืนยันอีเมลเพื่อวัตถุประสงค์ด้านความปลอดภัย</p>
          </section>

          {/* 9. Data Collection & Privacy */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">9. Data Collection &amp; Privacy / การรวบรวมข้อมูลและความเป็นส่วนตัว</h2>
            <p>We collect and process personal data in accordance with applicable privacy laws. Information collected includes: account registration data (email, display names), learning progress and assessment scores, device information for security and session management, and payment information (processed securely by Stripe). We do not sell personal information to third parties. Data is stored securely using industry-standard encryption. For detailed information, please refer to our <Link href="/privacy" className="text-sky-dark hover:underline">Privacy Policy</Link>.</p>
            <p className="font-sarabun text-text-mid mt-2">เรารวบรวมและประมวลผลข้อมูลส่วนบุคคลตามกฎหมายความเป็นส่วนตัวที่เกี่ยวข้อง ข้อมูลที่รวบรวมได้แก่: ข้อมูลการลงทะเบียนบัญชี (อีเมล ชื่อที่แสดง) ความก้าวหน้าในการเรียนรู้และคะแนนการประเมิน ข้อมูลอุปกรณ์สำหรับความปลอดภัยและการจัดการเซสชัน และข้อมูลการชำระเงิน (ประมวลผลอย่างปลอดภัยโดย Stripe) เราไม่ขายข้อมูลส่วนบุคคลให้กับบุคคลที่สาม ข้อมูลถูกจัดเก็บอย่างปลอดภัยโดยใช้การเข้ารหัสมาตรฐานอุตสาหกรรม สำหรับข้อมูลโดยละเอียด กรุณาอ่าน<Link href="/privacy" className="text-sky-dark hover:underline">นโยบายความเป็นส่วนตัว</Link>ของเรา</p>
          </section>

          {/* 10. Disclaimer of Warranties */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">10. Disclaimer of Warranties / ข้อสงวนสิทธิ์การรับประกัน</h2>
            <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components.</p>
            <p className="font-sarabun text-text-mid mt-2">บริการนี้ให้บริการ &quot;ตามสภาพ&quot; และ &quot;ตามที่มีอยู่&quot; โดยไม่มีการรับประกันใดๆ ทั้งโดยชัดแจ้งหรือโดยนัย รวมถึงแต่ไม่จำกัดเพียงการรับประกันโดยนัยเกี่ยวกับความสามารถในการจำหน่ายได้ (Merchantability) ความเหมาะสมสำหรับวัตถุประสงค์เฉพาะ และการไม่ละเมิดสิทธิ์ เราไม่รับประกันว่าบริการจะไม่ถูกขัดจังหวะ ปราศจากข้อผิดพลาด หรือปราศจากส่วนประกอบที่เป็นอันตราย</p>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">11. Limitation of Liability / ข้อจำกัดความรับผิด</h2>
            <p>To the maximum extent permitted by law, English Allstars LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or in connection with your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the twelve (12) months preceding the claim.</p>
            <p className="font-sarabun text-text-mid mt-2">ภายในขอบเขตสูงสุดที่กฎหมายอนุญาต English Allstars LLC จะไม่รับผิดต่อความเสียหายทางอ้อม ความเสียหายที่เกิดขึ้นโดยบังเอิญ ความเสียหายพิเศษ ความเสียหายที่เป็นผลสืบเนื่อง หรือค่าเสียหายเชิงลงโทษ (Punitive Damages) หรือการสูญเสียกำไร ข้อมูล หรือค่าความนิยม (Goodwill) ที่เกิดจากหรือเกี่ยวข้องกับการใช้บริการของคุณ ความรับผิดรวมของเราจะไม่เกินจำนวนเงินที่คุณชำระสำหรับบริการในช่วงสิบสอง (12) เดือนก่อนการเรียกร้อง</p>
          </section>

          {/* 12. Modifications to Terms */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">12. Modifications to Terms / การแก้ไขข้อกำหนด</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by email or through the Service. Continued use of the Service after changes are posted constitutes acceptance of the modified terms.</p>
            <p className="font-sarabun text-text-mid mt-2">เราขอสงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา เราจะแจ้งให้ผู้ใช้ทราบถึงการเปลี่ยนแปลงที่สำคัญทางอีเมลหรือผ่านบริการ การใช้บริการต่อไปหลังจากมีการโพสต์การเปลี่ยนแปลงถือเป็นการยอมรับข้อกำหนดที่แก้ไขแล้ว</p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">13. Governing Law / กฎหมายที่ใช้บังคับ</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of the State of Delaware.</p>
            <p className="font-sarabun text-text-mid mt-2">ข้อกำหนดเหล่านี้อยู่ภายใต้และตีความตามกฎหมายของรัฐเดลาแวร์ สหรัฐอเมริกา โดยไม่คำนึงถึงบทบัญญัติว่าด้วยการขัดกันของกฎหมาย ข้อพิพาทใดๆ ที่เกิดจากข้อกำหนดเหล่านี้จะได้รับการแก้ไขในศาลของรัฐเดลาแวร์</p>
          </section>

          {/* 14. Contact Information */}
          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">14. Contact Information / ข้อมูลติดต่อ</h2>
            <p>
              If you have questions about these Terms, please contact us at:{" "}
              <a href="mailto:info@englishallstars.com" className="text-sky-dark hover:underline">
                info@englishallstars.com
              </a>
            </p>
            <p className="font-sarabun text-text-mid mt-2">
              หากคุณมีคำถามเกี่ยวกับข้อกำหนดเหล่านี้ กรุณาติดต่อเราที่:{" "}
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
