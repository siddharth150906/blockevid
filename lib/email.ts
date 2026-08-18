import nodemailer from "nodemailer";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email: string, otp: string, officerName?: string): Promise<{ success: boolean; devMode?: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("\n=======================================================");
  console.log("🛡️ [BLOCKEVID CYBER SECURITY AUTHENTICATION OTP]");
  console.log(`👤 Target Officer: ${officerName || "Investigator"} (${email})`);
  console.log(`🔑 6-DIGIT VERIFICATION CODE: >>> [ ${otp} ] <<<`);
  console.log("⏰ Valid for: 10 minutes");
  console.log("=======================================================\n");

  if (!host || !user || !pass) {
    // Development mode fallback when SMTP is not configured
    return { success: true, devMode: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });

    const htmlContent = `
      <div style="background-color: #030712; color: #f3f4f6; font-family: 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 12px; border: 1px solid #1f2937; max-width: 540px; margin: auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; color: #10b981; font-weight: bold; font-size: 20px;">
            🛡️ BlockEvid
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 8px;">Immutable Digital Evidence & Chain-of-Custody Tracker</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; border-radius: 8px;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Officer Verification Code</h2>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.5;">
            Greetings <strong>${officerName || "Officer"}</strong>,<br/>
            Please use the following 6-digit cryptographic verification code to authenticate your digital evidence officer credentials on the BlockEvid ledger:
          </p>

          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; background: #0b0f19; padding: 16px 28px; border-radius: 8px; border: 1px dashed rgba(16, 185, 129, 0.4); font-family: monospace;">
              ${otp}
            </span>
          </div>

          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            ⏳ This code is cryptographically bounded and will expire in <strong>10 minutes</strong>. Never share this code with unauthorized personnel.
          </p>
        </div>

        <div style="margin-top: 24px; text-align: center; color: #6b7280; font-size: 11px;">
          National Cyber Forensic Infrastructure • BlockEvid Judicial Security<br/>
          Automated System Message - Please do not reply directly.
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"BlockEvid Forensic Security" <${user}>`,
      to: email,
      subject: `[BlockEvid] ${otp} is your Officer Verification Code`,
      text: `Your BlockEvid verification code is: ${otp}. Valid for 10 minutes.`,
      html: htmlContent,
    });

    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[BlockEvid Email Delivery Error]:", err.message);
    return { success: true, devMode: true, error: err.message };
  }
}
