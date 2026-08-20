import { Resend } from "resend";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "blockevid_super_secure_jwt_secret_key_2026_chain_of_custody_jwt";

/**
 * Robustly reads an environment variable from process.env or directly from local .env files.
 * This guarantees live detection even before a Next.js dev server restart.
 */
function getEnvValue(key: string): string {
  // 1. Check process.env
  if (process.env[key] && process.env[key]!.trim().length > 0) {
    return process.env[key]!.trim();
  }

  // 2. Dynamic fallback: check local disk .env files
  try {
    const envFiles = [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), ".env"),
      path.join(process.cwd(), "env.local"),
    ];

    for (const filePath of envFiles) {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const lines = fileContent.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
          const [k, ...valParts] = trimmed.split("=");
          if (k.trim() === key) {
            let val = valParts.join("=").trim();
            // Strip wrapping quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (val && val.trim().length > 0) {
              return val.trim();
            }
          }
        }
      }
    }
  } catch (err) {
    // ignore filesystem read error
  }

  return "";
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateSecureOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash OTP using HMAC-SHA256 salted with the normalized email and server secret.
 */
export function hashOTP(otp: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${normalizedEmail}:${otp.trim()}`)
    .digest("hex");
}

/**
 * Verify if the entered OTP matches the stored hash.
 */
export function verifyOTPHash(otp: string, email: string, storedHash: string): boolean {
  if (!otp || !email || !storedHash) return false;
  const calculated = hashOTP(otp, email);
  try {
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

/**
 * Get Resend client instance.
 */
export function getResendClient(): { resend: Resend | null; from: string; isConfigured: boolean; errorReason?: string } {
  const apiKey = getEnvValue("RESEND_API_KEY");
  const from = getEnvValue("RESEND_FROM") || "BlockEvid <onboarding@resend.dev>";

  if (!apiKey) {
    return { 
      resend: null, 
      from, 
      isConfigured: false, 
      errorReason: "RESEND_API_KEY is empty in .env.local. Please paste your Resend API Key (starts with re_) and save the file." 
    };
  }

  if (apiKey.startsWith("your_") || apiKey.startsWith("re_your_")) {
    return { 
      resend: null, 
      from, 
      isConfigured: false, 
      errorReason: "RESEND_API_KEY still contains placeholder text. Please replace it with your actual key from https://resend.com/api-keys." 
    };
  }

  return {
    resend: new Resend(apiKey),
    from,
    isConfigured: true,
  };
}

/**
 * Sends a 6-digit OTP verification email via Resend.
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  officerName?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const { resend, from, isConfigured, errorReason } = getResendClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isConfigured || !resend) {
    console.error("[BlockEvid Resend Error]:", errorReason);
    return {
      success: false,
      error: errorReason || "Resend email service is not configured. Please add RESEND_API_KEY to your .env.local file.",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>BlockEvid Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #090d1a; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
              
              <!-- Header Bar -->
              <tr>
                <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #111827;">
                  <div style="display: inline-block; padding: 10px 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; color: #10b981; font-weight: 800; font-size: 22px; letter-spacing: 0.5px;">
                    🛡️ BlockEvid
                  </div>
                  <div style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; font-weight: 600;">
                    Immutable Digital Evidence & Chain-of-Custody Tracker
                  </div>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 32px; color: #e5e7eb;">
                  <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
                    Verify Your Officer Email Address
                  </h2>
                  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                    Hello <strong style="color: #ffffff;">${officerName || "Officer"}</strong>,<br/>
                    Please use the following 6-digit cryptographic verification code to authenticate your officer credentials on the BlockEvid ledger:
                  </p>

                  <!-- OTP Box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 12px 0 24px 0;">
                        <div style="display: inline-block; background: #030712; border: 2px dashed rgba(16, 185, 129, 0.5); border-radius: 12px; padding: 18px 36px; text-align: center;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #10b981; margin-left: 12px;">
                            ${otp}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Security Warning -->
                  <div style="background: rgba(15, 23, 42, 0.6); border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                    <p style="color: #d1d5db; font-size: 13px; margin: 0; line-height: 1.5;">
                      ⏰ <strong>Valid for 5 minutes.</strong><br/>
                      🔒 <strong>Security Notice:</strong> Never share this verification code with anyone. BlockEvid administrators or judicial officers will never ask for your code.
                    </p>
                  </div>

                  <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
                    If you did not request this verification code, please ignore this email or report unauthorized access to your cyber security administrator.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #030712; border-top: 1px solid #111827; text-align: center; color: #4b5563; font-size: 11px; line-height: 1.5;">
                  National Cyber Forensic Infrastructure • BlockEvid Judicial Security<br/>
                  This is an automated judicial security message. Do not reply directly.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [normalizedEmail],
      subject: `[BlockEvid] ${otp} is your 6-digit verification code`,
      text: `Your BlockEvid verification code is: ${otp}\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone.`,
      html: htmlContent,
    });

    if (error) {
      console.error("[BlockEvid Resend API Error]:", error);
      return {
        success: false,
        error: error.message || "Failed to deliver verification email via Resend.",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    console.error("[BlockEvid Resend Exception]:", err);
    return {
      success: false,
      error: `Failed to deliver email: ${err.message}`,
    };
  }
}
