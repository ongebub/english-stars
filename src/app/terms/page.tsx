import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/login" className="text-sky-dark text-sm font-semibold hover:underline">
          ← Back / กลับ
        </Link>

        <h1 className="font-nunito text-3xl font-extrabold text-text-dark mt-6 mb-2">
          Terms & Conditions
        </h1>
        <p className="font-sarabun text-text-mid mb-8">ข้อกำหนดและเงื่อนไข</p>

        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 space-y-6 text-text-dark text-sm leading-relaxed">

          <p className="text-text-mid text-xs">Last updated: July 11, 2026</p>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account on English Allstars (&quot;the Service&quot;), you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the Service. If you are creating an account on behalf of a minor, you represent that you are the parent or legal guardian of that minor and accept these terms on their behalf.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">2. Description of Service</h2>
            <p>English Allstars is an online English language learning platform designed for children, offering interactive ebooks, flashcards, quizzes, and other educational content. The Service is operated by English Allstars LLC.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">3. User Accounts</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account. Accounts are for individual family or school use only and may not be shared with other families or institutions.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">4. Children&apos;s Privacy (COPPA Compliance)</h2>
            <p>We comply with the Children&apos;s Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 without verifiable parental consent. Parent or guardian accounts are required to create child profiles. Child profiles do not require email addresses. We collect only the minimum information necessary to provide the educational service (display name, learning progress, and quiz scores). Parents may review, modify, or delete their child&apos;s information at any time through the Dashboard.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">5. Subscription & Payments</h2>
            <p>Certain features require a paid subscription. Subscription fees are charged on a recurring basis as specified at the time of purchase. You may cancel your subscription at any time through your Dashboard. Cancellation takes effect at the end of the current billing period. Refund requests are handled on a case-by-case basis. Please contact info@englishallstars.com for refund inquiries.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">6. Intellectual Property</h2>
            <p>All content on English Allstars, including but not limited to text, images, illustrations, audio recordings, animations, software code, and educational materials, is the exclusive property of English Allstars LLC and is protected by copyright, trademark, and other intellectual property laws. You may not copy, reproduce, distribute, modify, display, perform, or create derivative works from any content without prior written permission from English Allstars LLC.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">7. Acceptable Use</h2>
            <p>You agree not to: (a) share your account credentials with unauthorized parties; (b) use the Service for any unlawful purpose; (c) attempt to access the Service through automated means (bots, scrapers, etc.); (d) reverse engineer, decompile, or disassemble any part of the Service; (e) interfere with or disrupt the Service or its servers; (f) upload or transmit any harmful content. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">8. Device Limitations</h2>
            <p>To prevent unauthorized sharing, each child profile may be actively used on a maximum of two (2) devices simultaneously. If a third device is used, the oldest active session will be automatically terminated. New devices may require email verification for security purposes.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">9. Data Collection & Privacy</h2>
            <p>We collect and process personal data in accordance with applicable privacy laws. Information collected includes: account registration data (email, display names), learning progress and assessment scores, device information for security and session management, and payment information (processed securely by Stripe). We do not sell personal information to third parties. Data is stored securely using industry-standard encryption. For detailed information, please refer to our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">10. Disclaimer of Warranties</h2>
            <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, English Allstars LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or in connection with your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the twelve (12) months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">12. Modifications to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by email or through the Service. Continued use of the Service after changes are posted constitutes acceptance of the modified terms.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">13. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of the State of Delaware.</p>
          </section>

          <section>
            <h2 className="font-nunito text-lg font-bold mb-2">14. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us at:{" "}
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
