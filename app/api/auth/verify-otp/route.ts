import { NextResponse } from "next/server";
import { findUserByEmail, updateUser, verifySecureOtp } from "@/lib/db";
import { createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    if (typeof otp !== "string" || otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 6-digit numeric verification code." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify OTP using secure hash checking, 5-minute expiry & max 5 attempts lockout
    const verification = await verifySecureOtp(normalizedEmail, otp.trim(), "SIGNUP_VERIFY");

    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          message: verification.error || "Invalid verification code.",
          attemptsRemaining: verification.attemptsRemaining,
          isLocked: verification.isLocked,
          isExpired: verification.isExpired,
        },
        { status: 400 }
      );
    }

    // Mark user email verified in DB if user record exists
    const user = await findUserByEmail(normalizedEmail);
    let sanitized = null;

    if (user) {
      const updatedUser = await updateUser(user.id, { is_email_verified: true });
      if (updatedUser) {
        sanitized = sanitizeUser(updatedUser);
        const token = await createSessionToken(updatedUser);
        await setSessionCookie(token);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. Chain of custody credentials authorized.",
      user: sanitized,
    });
  } catch (err: any) {
    console.error("[BlockEvid Verify OTP API Error]:", err);
    return NextResponse.json(
      { success: false, message: "An error occurred during verification. Please try again." },
      { status: 500 }
    );
  }
}
