import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const HEADER_STYLE = `background: linear-gradient(135deg, #0288D1 0%, #1565C0 100%); border-radius: 16px 16px 0 0; padding: 24px 32px; text-align: center;`;
const BODY_STYLE = `background: #ffffff; border-radius: 0 0 16px 16px; padding: 32px; text-align: center;`;
const WRAPPER_STYLE = `font-family: 'Nunito', Arial, sans-serif; max-width: 420px; margin: 0 auto; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.10);`;

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL || "English Allstars <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to,
    subject: `${code} is your English Allstars verification code`,
    html: `
      <div style="${WRAPPER_STYLE}">
        <div style="${HEADER_STYLE}">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 900;">English Allstars</h1>
        </div>
        <div style="${BODY_STYLE}">
          <p style="color: #455A64; font-size: 16px; margin-bottom: 24px;">
            Your verification code is:<br />
            <span style="font-family: 'Sarabun', sans-serif;">รหัสยืนยันของคุณคือ:</span>
          </p>
          <div style="background: #E3F2FD; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1A237E;">${code}</span>
          </div>
          <p style="color: #90A4AE; font-size: 14px;">
            This code expires in 10 minutes.<br />
            <span style="font-family: 'Sarabun', sans-serif;">รหัสนี้จะหมดอายุใน 10 นาที</span>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  trialEndDate: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL || "English Allstars <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to,
    subject: "ยินดีต้อนรับสู่ English Allstars! ทดลองใช้ฟรี 7 วันเริ่มแล้ว",
    html: `
      <div style="${WRAPPER_STYLE}">
        <div style="${HEADER_STYLE}">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 900;">English Allstars</h1>
        </div>
        <div style="${BODY_STYLE}">
          <h2 style="color: #1A237E; font-size: 20px; font-weight: 900; margin-bottom: 4px;">ยินดีต้อนรับสู่ English Allstars!</h2>
          <p style="color: #78909C; font-size: 13px; margin-bottom: 24px;">Welcome to English Allstars!</p>

          <p style="color: #37474F; font-size: 16px; margin-bottom: 8px; font-family: 'Sarabun', sans-serif;">
            การทดลองใช้ฟรี 7 วันของคุณเริ่มต้นแล้ว
          </p>
          <p style="color: #78909C; font-size: 13px; margin-bottom: 24px;">Your 7-day free trial has started.</p>

          <div style="background: #E3F2FD; border-radius: 12px; padding: 16px 24px; margin-bottom: 24px; text-align: left;">
            <p style="color: #37474F; font-size: 14px; margin: 0 0 8px 0; font-family: 'Sarabun', sans-serif;">
              การทดลองใช้จะสิ้นสุดในวันที่: <strong style="color: #0288D1;">${trialEndDate}</strong>
            </p>
            <p style="color: #37474F; font-size: 14px; margin: 0 0 8px 0; font-family: 'Sarabun', sans-serif;">
              หลังจากวันที่ ${trialEndDate} ระบบจะเรียกเก็บเงิน <strong>750 บาทต่อเดือน</strong>โดยอัตโนมัติ
            </p>
            <p style="color: #78909C; font-size: 12px; margin: 0; font-family: 'Sarabun', sans-serif;">
              ยกเลิกได้ตลอดเวลาในหน้าตั้งค่าบัญชี — Cancel anytime in account settings
            </p>
          </div>

          <a href="https://englishallstars.com/learn"
             style="display: inline-block; background: linear-gradient(135deg, #0288D1 0%, #43A047 100%);
                    color: #ffffff; font-weight: 900; font-size: 16px; padding: 14px 36px;
                    border-radius: 12px; text-decoration: none; margin-bottom: 24px;">
            เริ่มเรียนเลย →
          </a>

          <p style="color: #90A4AE; font-size: 12px; margin: 0;">
            มีคำถาม? ติดต่อเรา:
            <a href="mailto:info@englishallstars.com" style="color: #0288D1;">info@englishallstars.com</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendTrialReminderEmail(
  to: string,
  chargeDate: string,
  chargeAmount: string,
  progress?: { subjects: number; trophies: number }
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL || "English Allstars <onboarding@resend.dev>";

  const progressHtml = progress
    ? `<div style="background: #F1F8E9; border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; text-align: left;">
         <p style="color: #37474F; font-size: 14px; margin: 0; font-family: 'Sarabun', sans-serif;">
           ลูกของคุณได้เรียนไปแล้ว <strong>${progress.subjects} หัวข้อ</strong> และได้รับ <strong>${progress.trophies} ถ้วยรางวัล</strong>!
         </p>
       </div>`
    : "";

  await resend.emails.send({
    from,
    to,
    subject: "การทดลองใช้ English Allstars ของคุณจะสิ้นสุดใน 2 วัน",
    html: `
      <div style="${WRAPPER_STYLE}">
        <div style="${HEADER_STYLE}">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 900;">English Allstars</h1>
        </div>
        <div style="${BODY_STYLE}">
          <h2 style="color: #1A237E; font-size: 18px; font-weight: 900; margin-bottom: 20px; font-family: 'Sarabun', sans-serif;">
            การทดลองใช้ของคุณจะสิ้นสุดใน 2 วัน
          </h2>

          <div style="background: #FFF8E1; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; text-align: left;">
            <p style="color: #37474F; font-size: 14px; margin: 0 0 6px 0; font-family: 'Sarabun', sans-serif;">
              การทดลองใช้จะสิ้นสุดในวันที่: <strong style="color: #F57F17;">${chargeDate}</strong>
            </p>
            <p style="color: #37474F; font-size: 14px; margin: 0; font-family: 'Sarabun', sans-serif;">
              ระบบจะเรียกเก็บเงิน <strong>${chargeAmount}</strong> โดยอัตโนมัติ
            </p>
          </div>

          ${progressHtml}

          <p style="color: #546E7A; font-size: 14px; margin-bottom: 20px; font-family: 'Sarabun', sans-serif;">
            ยกเลิกได้เลยโดยไม่มีค่าใช้จ่าย ก่อนวันที่ ${chargeDate}
          </p>

          <a href="https://englishallstars.com/settings/billing"
             style="display: inline-block; background: #f5f5f5; color: #37474F; font-weight: 700;
                    font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;
                    border: 1px solid #e0e0e0; margin-bottom: 20px; font-family: 'Sarabun', sans-serif;">
            จัดการสมาชิก / Manage subscription
          </a>

          <p style="color: #90A4AE; font-size: 12px; margin: 0;">
            <a href="mailto:info@englishallstars.com" style="color: #0288D1;">info@englishallstars.com</a>
          </p>
        </div>
      </div>
    `,
  });
}
