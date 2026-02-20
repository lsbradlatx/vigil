import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key || key.trim() === "") {
      throw new Error("RESEND_API_KEY is not set. Add it in .env (local) or Railway Variables (production).");
    }
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Vigil <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key.trim() !== "";
}

/**
 * Sends the verification email. Returns { ok: true } on success, or { ok: false, error: string } on failure.
 * Caller can use this to show a clear message (e.g. "Check spam" or "Email not configured").
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const resend = getResend();
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    const { data, error } = await resend.emails.send({
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

    if (error) {
      console.error("Resend API error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send verification email:", err);
    return { ok: false, error: message };
  }
}
