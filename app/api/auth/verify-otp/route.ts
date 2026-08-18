import { NextResponse } from "next/server";
import { findUserByEmail, updateUser, verifyAndConsumeOtp } from "@/lib/db";
import { createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP code are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isValid = await verifyAndConsumeOtp(normalizedEmail, otp.trim(), "SIGNUP_VERIFY");

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please check your email or request a new code." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({ error: "Officer record not found." }, { status: 404 });
    }

    // Mark email as verified
    const updatedUser = await updateUser(user.id, { is_email_verified: true });
    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update officer verification state." }, { status: 500 });
    }

    // Issue session cookie
    const token = await createSessionToken(updatedUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Officer credentials verified. Chain of custody access authorized.",
      user: sanitizeUser(updatedUser),
    });
  } catch (err: any) {
    console.error("[BlockEvid Verify OTP API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to verify OTP." }, { status: 500 });
  }
}
