import { NextResponse } from "next/server";
import { findUserByEmail, createOtp } from "@/lib/db";
import { generateOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json({ error: "No officer account found for this email address." }, { status: 404 });
    }

    if (user.is_email_verified) {
      return NextResponse.json({ error: "Account is already verified. Please log in directly." }, { status: 400 });
    }

    const otp = generateOTP();
    await createOtp(normalizedEmail, otp, "SIGNUP_VERIFY", 10);
    const emailResult = await sendOtpEmail(normalizedEmail, otp, user.name);

    return NextResponse.json({
      success: true,
      message: `A fresh 6-digit code has been dispatched to ${normalizedEmail}.`,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      devMode: emailResult.devMode,
    });
  } catch (err: any) {
    console.error("[BlockEvid Resend OTP API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to resend verification code." }, { status: 500 });
  }
}
