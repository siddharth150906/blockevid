import { NextResponse } from "next/server";
import { getResendClient, sendOtpEmail, generateSecureOTP } from "@/lib/email";

export async function GET() {
  try {
    const { isConfigured, from } = getResendClient();
    return NextResponse.json({
      success: isConfigured,
      service: "Resend",
      configured: isConfigured,
      fromAddress: from,
      instructions: !isConfigured
        ? "To enable live email delivery via Resend, add RESEND_API_KEY to your .env.local file (e.g. RESEND_API_KEY=\"re_12345...\")."
        : "Resend is configured. Live 6-digit OTP emails will be sent directly to user inboxes.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to inspect Resend service." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required for test send." }, { status: 400 });
    }

    const { isConfigured } = getResendClient();
    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        message: "Resend is not configured. Please set RESEND_API_KEY in .env.local.",
      }, { status: 400 });
    }

    const testOtp = generateSecureOTP();
    const sendResult = await sendOtpEmail(email, testOtp, "Officer Diagnostic Test");

    return NextResponse.json({
      success: sendResult.success,
      message: sendResult.success ? `Test OTP email successfully delivered to ${email} via Resend.` : sendResult.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
