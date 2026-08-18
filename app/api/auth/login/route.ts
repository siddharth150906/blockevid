import { NextResponse } from "next/server";
import { findUserByEmail, createOtp } from "@/lib/db";
import { comparePassword, createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";
import { generateOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Invalid officer credentials." }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid officer credentials." }, { status: 401 });
    }

    // If account is not email verified, trigger OTP flow
    if (!user.is_email_verified) {
      const otp = generateOTP();
      await createOtp(normalizedEmail, otp, "SIGNUP_VERIFY", 10);
      const emailResult = await sendOtpEmail(normalizedEmail, otp, user.name);

      return NextResponse.json(
        {
          requiresOtp: true,
          email: normalizedEmail,
          message: "Email verification required. A new 6-digit code has been dispatched.",
          devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
          devMode: emailResult.devMode,
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
    return NextResponse.json({ error: err.message || "Failed to process login." }, { status: 500 });
  }
}
