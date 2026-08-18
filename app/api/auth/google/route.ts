import { NextResponse } from "next/server";
import { verifyGoogleToken } from "@/lib/google";
import { findUserByEmail, findUserByGoogleId, createUser, updateUser } from "@/lib/db";
import { createSessionToken, setSessionCookie, sanitizeUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credential, email: testEmail, name: testName } = body;

    let googleUser = null;

    if (credential) {
      googleUser = await verifyGoogleToken(credential);
    } else if (testEmail) {
      // Mock / Dev quick Google login handler
      googleUser = {
        googleId: `google_mock_${Date.now()}`,
        email: testEmail.toLowerCase(),
        name: testName || testEmail.split("@")[0],
        picture: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        isEmailVerified: true,
      };
    }

    if (!googleUser) {
      return NextResponse.json({ error: "Invalid Google OAuth authentication credential." }, { status: 400 });
    }

    // Check if user exists by Google ID or by email
    let user = await findUserByGoogleId(googleUser.googleId);
    if (!user) {
      user = await findUserByEmail(googleUser.email);
    }

    if (user) {
      // User exists -> update Google ID and avatar if needed, and verify email
      const updates: any = { is_email_verified: true };
      if (!user.google_id) updates.google_id = googleUser.googleId;
      if (!user.avatar_url && googleUser.picture) updates.avatar_url = googleUser.picture;

      const updatedUser = await updateUser(user.id, updates);
      user = updatedUser || user;
    } else {
      // First-time signup via Google
      user = await createUser({
        email: googleUser.email,
        name: googleUser.name || "Investigating Officer",
        phone: "", // Missing -> will require profile completion
        designation: "", // Missing -> will require profile completion
        agency: "Delhi Cyber Cell",
        is_email_verified: true,
        google_id: googleUser.googleId,
        avatar_url: googleUser.picture || null,
      });
    }

    // Check if profile has all mandatory fields (name, phone, designation)
    const needsProfileCompletion = !user.phone || !user.designation || !user.name;

    // Issue session token
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      needsProfileCompletion,
      message: needsProfileCompletion
        ? "Please complete mandatory officer profile fields (Phone & Designation)."
        : "Google authentication authorized.",
    });
  } catch (err: any) {
    console.error("[BlockEvid Google Auth API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process Google authentication." }, { status: 500 });
  }
}
