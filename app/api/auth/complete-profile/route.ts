import { NextResponse } from "next/server";
import { getCurrentUser, createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please authenticate first." }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, designation, agency } = body;

    // Strict validation for all 3 mandatory onboarding fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Officer Full Name is mandatory (minimum 2 characters)." }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 5) {
      return NextResponse.json({ error: "Official Contact Phone Number is mandatory." }, { status: 400 });
    }

    if (!designation || typeof designation !== "string" || designation.trim().length < 2) {
      return NextResponse.json({ error: "Officer Designation / Rank is mandatory." }, { status: 400 });
    }

    const updatedUser = await updateUser(user.id, {
      name: name.trim(),
      phone: phone.trim(),
      designation: designation.trim(),
      agency: agency ? agency.trim() : user.agency || "Delhi Cyber Cell",
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update officer profile." }, { status: 500 });
    }

    // Refresh session cookie
    const token = await createSessionToken(updatedUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Officer credentials verified & chain of custody profile initialized.",
      user: sanitizeUser(updatedUser),
    });
  } catch (err: any) {
    console.error("[BlockEvid Complete Profile API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile." }, { status: 500 });
  }
}
