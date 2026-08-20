import { NextResponse } from "next/server";
import { findUserByEmail, createSecureOtp } from "@/lib/db";
import { comparePassword, createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";
import { generateSecureOTP, hashOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.password_hash) {
      return NextResponse.json({ success: false, message: "Invalid officer credentials." }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Invalid officer credentials." }, { status: 401 });
    }

    // If account is not email verified, trigger OTP flow with 5-minute expiry via Resend
    if (!user.is_email_verified) {
      const otp = generateSecureOTP();
      const otpHash = hashOTP(otp, normalizedEmail);
      await createSecureOtp(normalizedEmail, otpHash, "SIGNUP_VERIFY", 5);
      const emailResult = await sendOtpEmail(normalizedEmail, otp, user.name);

      if (!emailResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: emailResult.error || "Failed to dispatch OTP email. Please check your email settings.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          requiresOtp: true,
          email: normalizedEmail,
          message: "Email verification required. A fresh 6-digit code has been dispatched to your email.",
        },
        { status: 403 }
      );
    }

    // Set session cookie
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Officer identity authenticated.",
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("[BlockEvid Login API Error]:", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to process login." }, { status: 500 });
  }
}
