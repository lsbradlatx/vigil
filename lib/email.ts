import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Vigil <onboarding@resend.dev>";

export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string,
) {
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Verify your Vigil account",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 28px; font-weight: 400; color: #2C2C2C; margin-bottom: 24px;">
          Welcome to Vigil
        </h1>
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 32px;">
          Click the button below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #6D7355; color: #fff; text-decoration: none;
                  padding: 12px 32px; border-radius: 6px; font-size: 14px; letter-spacing: 0.5px;
                  text-transform: uppercase;">
          Verify Email
        </a>
        <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #6D7355;">${verifyUrl}</a>
        </p>
        <p style="font-size: 13px; color: #999; margin-top: 16px;">
          This link expires in 24 hours. If you didn't create a Vigil account, you can ignore this email.
        </p>
      </div>
    `,
  });
}
