import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserById, UserRecord } from "./db";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "blockevid_super_secure_jwt_secret_key_2026_chain_of_custody_jwt";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const SESSION_COOKIE_NAME = "blockevid_session_token";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayloadData {
  userId: string;
  email: string;
  name: string;
  designation: string;
  agency: string;
  isEmailVerified: boolean;
}

export async function createSessionToken(user: UserRecord): Promise<string> {
  const payload: JWTPayloadData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    designation: user.designation,
    agency: user.agency,
    isEmailVerified: user.is_email_verified,
  };

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<JWTPayloadData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayloadData;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;

  return findUserById(payload.userId);
}

export function sanitizeUser(user: UserRecord) {
  const { password_hash, ...safeUser } = user;
  const isProfileComplete = Boolean(
    safeUser.name &&
    safeUser.phone &&
    safeUser.designation &&
    safeUser.name.trim().length > 0 &&
    safeUser.phone.trim().length > 0 &&
    safeUser.designation.trim().length > 0
  );

  return {
    ...safeUser,
    isProfileComplete,
  };
}
