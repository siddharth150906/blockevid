import { NextResponse } from "next/server";
import { findUserByEmail, createUser, updateUser, createSecureOtp } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateSecureOTP, hashOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone, designation, agency } = body;

    // Strict validation of mandatory fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: "Officer Full Name is mandatory (minimum 2 characters)." }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      return NextResponse.json({ success: false, message: "Official Contact Phone Number is mandatory." }, { status: 400 });
    }

    if (!designation || typeof designation !== "string" || designation.trim().length < 2) {
      return NextResponse.json({ success: false, message: "Officer Designation / Rank is mandatory." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "A valid email address is mandatory." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ success: false, message: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser && existingUser.is_email_verified) {
      return NextResponse.json(
        { success: false, message: "An officer account with this email already exists. Please log in." },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    if (existingUser) {
      // Update pending unverified account
      await updateUser(existingUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        agency: agency ? agency.trim() : "Delhi Cyber Cell",
        password_hash,
      });
    } else {
      // Create new unverified user
      await createUser({
        email: normalizedEmail,
        password_hash,
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        agency: agency ? agency.trim() : "Delhi Cyber Cell",
        is_email_verified: false,
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP();
    const otpHash = hashOTP(otp, normalizedEmail);

    // Save hashed OTP in DB with 5-minute expiration
    await createSecureOtp(normalizedEmail, otpHash, "SIGNUP_VERIFY", 5);

    // Send email with OTP via Resend
    const emailResult = await sendOtpEmail(normalizedEmail, otp, name.trim());

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: emailResult.error || "Failed to deliver verification email. Please check your Resend API configuration.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInMinutes: 5,
    });
  } catch (err: any) {
    console.error("[BlockEvid Signup API Error]:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process signup request." },
      { status: 500 }
    );
  }
}
