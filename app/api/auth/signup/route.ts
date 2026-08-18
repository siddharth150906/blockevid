import { NextResponse } from "next/server";
import { findUserByEmail, createUser, updateUser, createOtp } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateOTP, sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone, designation, agency } = body;

    // Strict validation of mandatory fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Officer Full Name is mandatory (minimum 2 characters)." }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      return NextResponse.json({ error: "Official Contact Phone Number is mandatory." }, { status: 400 });
    }

    if (!designation || typeof designation !== "string" || designation.trim().length < 2) {
      return NextResponse.json({ error: "Officer Designation / Rank is mandatory." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is mandatory." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser && existingUser.is_email_verified) {
      return NextResponse.json(
        { error: "An officer account with this email already exists. Please log in." },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    let userId: string;
    if (existingUser) {
      // Update pending unverified account
      await updateUser(existingUser.id, {
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        agency: agency ? agency.trim() : "Delhi Cyber Cell",
        password_hash,
      });
      userId = existingUser.id;
    } else {
      // Create new unverified user
      const newUser = await createUser({
        email: normalizedEmail,
        password_hash,
        name: name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        agency: agency ? agency.trim() : "Delhi Cyber Cell",
        is_email_verified: false,
      });
      userId = newUser.id;
    }

    // Generate 6-digit cryptographic OTP
    const otp = generateOTP();
    await createOtp(normalizedEmail, otp, "SIGNUP_VERIFY", 10);

    // Send email with OTP
    const emailResult = await sendOtpEmail(normalizedEmail, otp, name.trim());

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      email: normalizedEmail,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      devMode: emailResult.devMode,
    });
  } catch (err: any) {
    console.error("[BlockEvid Signup API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process signup request." }, { status: 500 });
  }
}
