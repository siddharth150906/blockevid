import { NextResponse } from "next/server";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    console.error("[BlockEvid Me API Error]:", err);
    return NextResponse.json({ user: null });
  }
}
