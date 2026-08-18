import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch (err: any) {
    console.error("[BlockEvid Logout API Error]:", err);
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
