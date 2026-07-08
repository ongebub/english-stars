import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
      <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 400px; margin: 0 auto; text-align: center; padding: 32px;">
        <h1 style="color: #0288D1; font-size: 24px; margin-bottom: 8px;">English Allstars</h1>
        <p style="color: #455A64; font-size: 16px; margin-bottom: 24px;">
          Your verification code is:
          <br />
          <span style="font-family: 'Sarabun', sans-serif;">รหัสยืนยันของคุณคือ:</span>
        </p>
        <div style="background: #E3F2FD; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1A237E;">${code}</span>
        </div>
        <p style="color: #90A4AE; font-size: 14px;">
          This code expires in 10 minutes.
          <br />
          <span style="font-family: 'Sarabun', sans-serif;">รหัสนี้จะหมดอายุใน 10 นาที</span>
        </p>
      </div>
    `,
  });
}
