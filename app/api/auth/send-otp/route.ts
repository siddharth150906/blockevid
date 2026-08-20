import { NextResponse } from "next/server";
import { createSecureOtp, checkOtpCooldown } from "@/lib/db";
import { generateSecureOTP, hashOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check 60-second cooldown rate limit
    const cooldown = await checkOtpCooldown(normalizedEmail, "SIGNUP_VERIFY", 60);
    if (cooldown.inCooldown) {
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${cooldown.secondsRemaining}s before requesting a new code.`,
          secondsRemaining: cooldown.secondsRemaining,
        },
        { status: 429 }
      );
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP();
    const otpHash = hashOTP(otp, normalizedEmail);

    // Store in DB with 5-minute expiration
    await createSecureOtp(normalizedEmail, otpHash, "SIGNUP_VERIFY", 5);

    // Dispatch email via Resend
    const emailResult = await sendOtpEmail(normalizedEmail, otp, name);

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: emailResult.error || "Unable to send verification email. Please check your Resend configuration.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInMinutes: 5,
    });
  } catch (err: any) {
    console.error("[BlockEvid Send-OTP API Error]:", err);
    return NextResponse.json(
      { success: false, message: "Unable to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
