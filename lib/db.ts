import { Pool } from "pg";
import crypto from "crypto";
import { verifyOTPHash } from "./email";

// Database interface types
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  phone: string;
  designation: string;
  agency: string;
  is_email_verified: boolean;
  google_id: string | null;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OtpRecord {
  id: string;
  email: string;
  otp_hash: string;
  type: string;
  expires_at: Date | string;
  attempts: number;
  is_used: boolean;
  created_at: Date | string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date | string;
  created_at: Date | string;
}

// In-Memory store fallback if Postgres DB is not yet reachable in dev
const memoryStore = {
  users: new Map<string, UserRecord>(),
  otps: new Map<string, OtpRecord>(),
  sessions: new Map<string, SessionRecord>(),
};

let pool: Pool | null = null;
let isPgAvailable: boolean | null = null;
let isInitialized = false;

function getPool(): Pool | null {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    return null;
  }

  try {
    const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.warn("[BlockEvid PostgreSQL Pool Error]:", err.message);
    });

    return pool;
  } catch (err) {
    console.warn("[BlockEvid] Failed initializing PG pool, falling back to memory:", err);
    return null;
  }
}

export async function initDb(): Promise<boolean> {
  if (isInitialized && isPgAvailable !== null) return isPgAvailable;

  const currentPool = getPool();
  if (!currentPool) {
    console.info("[BlockEvid DB] Operating with in-memory resilient storage (DATABASE_URL not connected).");
    isPgAvailable = false;
    isInitialized = true;
    return false;
  }

  try {
    const client = await currentPool.connect();
    try {
      // Create tables if they do not exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          designation VARCHAR(100) NOT NULL,
          agency VARCHAR(255) DEFAULT 'Delhi Cyber Cell',
          is_email_verified BOOLEAN DEFAULT FALSE,
          google_id VARCHAR(255) UNIQUE,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otps (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          otp_hash VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'SIGNUP_VERIFY',
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          attempts INTEGER DEFAULT 0,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Safe column migrations for existing databases
        ALTER TABLE otps ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255);
        ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_otps_email_type ON otps(email, type);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      `);
      isPgAvailable = true;
      isInitialized = true;
      console.info("[BlockEvid DB] PostgreSQL connected and schemas verified successfully.");
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(`[BlockEvid DB] PostgreSQL connection notice (${err.message}). Using in-memory storage fallback.`);
    isPgAvailable = false;
    isInitialized = true;
    return false;
  }
}

// User Queries
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  await initDb();

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<UserRecord>(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [normalizedEmail]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error("DB error in findUserByEmail:", err);
    }
  }

  // Fallback
  for (const user of memoryStore.users.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      return user;
    }
  }
  return null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await initDb();

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<UserRecord>(
        "SELECT * FROM users WHERE id = $1 LIMIT 1",
        [id]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error("DB error in findUserById:", err);
    }
  }

  return memoryStore.users.get(id) || null;
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  await initDb();

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<UserRecord>(
        "SELECT * FROM users WHERE google_id = $1 LIMIT 1",
        [googleId]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error("DB error in findUserByGoogleId:", err);
    }
  }

  for (const user of memoryStore.users.values()) {
    if (user.google_id === googleId) {
      return user;
    }
  }
  return null;
}

export async function createUser(data: {
  email: string;
  password_hash?: string | null;
  name: string;
  phone: string;
  designation: string;
  agency?: string;
  is_email_verified?: boolean;
  google_id?: string | null;
  avatar_url?: string | null;
}): Promise<UserRecord> {
  await initDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const normalizedEmail = data.email.trim().toLowerCase();

  const user: UserRecord = {
    id,
    email: normalizedEmail,
    password_hash: data.password_hash || null,
    name: data.name.trim(),
    phone: data.phone.trim(),
    designation: data.designation.trim(),
    agency: (data.agency || "Delhi Cyber Cell").trim(),
    is_email_verified: Boolean(data.is_email_verified),
    google_id: data.google_id || null,
    avatar_url: data.avatar_url || null,
    created_at: now,
    updated_at: now,
  };

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<UserRecord>(
        `INSERT INTO users (id, email, password_hash, name, phone, designation, agency, is_email_verified, google_id, avatar_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          user.id,
          user.email,
          user.password_hash,
          user.name,
          user.phone,
          user.designation,
          user.agency,
          user.is_email_verified,
          user.google_id,
          user.avatar_url,
          user.created_at,
          user.updated_at,
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error("DB error in createUser:", err);
    }
  }

  memoryStore.users.set(id, user);
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<UserRecord, "name" | "phone" | "designation" | "agency" | "is_email_verified" | "password_hash" | "avatar_url" | "google_id">>
): Promise<UserRecord | null> {
  await initDb();
  const now = new Date();

  if (isPgAvailable && pool) {
    try {
      const updates: string[] = ["updated_at = $2"];
      const values: any[] = [id, now];
      let i = 3;

      for (const [key, val] of Object.entries(data)) {
        updates.push(`${key} = $${i}`);
        values.push(val);
        i++;
      }

      const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $1 RETURNING *`;
      const res = await pool.query<UserRecord>(query, values);
      return res.rows[0] || null;
    } catch (err) {
      console.error("DB error in updateUser:", err);
    }
  }

  const existing = memoryStore.users.get(id);
  if (!existing) return null;

  const updated: UserRecord = {
    ...existing,
    ...data,
    updated_at: now,
  };
  memoryStore.users.set(id, updated);
  return updated;
}

// =========================================================================
// Secure OTP Queries & Operations
// =========================================================================

/**
 * Checks if the email is within the 60-second resend cooldown window.
 */
export async function checkOtpCooldown(
  email: string,
  type = "SIGNUP_VERIFY",
  cooldownSeconds = 60
): Promise<{ inCooldown: boolean; secondsRemaining: number }> {
  await initDb();
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  let latestCreatedAt: number | null = null;

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<{ created_at: Date }>(
        `SELECT created_at FROM otps 
         WHERE LOWER(email) = LOWER($1) AND type = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [normalizedEmail, type]
      );
      if (res.rows.length > 0) {
        latestCreatedAt = new Date(res.rows[0].created_at).getTime();
      }
    } catch (err) {
      console.error("DB error in checkOtpCooldown:", err);
    }
  } else {
    for (const item of memoryStore.otps.values()) {
      if (item.email.toLowerCase() === normalizedEmail && item.type === type) {
        const itemTime = new Date(item.created_at).getTime();
        if (!latestCreatedAt || itemTime > latestCreatedAt) {
          latestCreatedAt = itemTime;
        }
      }
    }
  }

  if (latestCreatedAt) {
    const elapsedSeconds = Math.floor((now - latestCreatedAt) / 1000);
    if (elapsedSeconds < cooldownSeconds) {
      return {
        inCooldown: true,
        secondsRemaining: cooldownSeconds - elapsedSeconds,
      };
    }
  }

  return { inCooldown: false, secondsRemaining: 0 };
}

/**
 * Store a new hashed OTP with a 5-minute expiration time.
 * Automatically invalidates previous unused OTPs for this email.
 */
export async function createSecureOtp(
  email: string,
  otpHash: string,
  type = "SIGNUP_VERIFY",
  expiresInMinutes = 5
): Promise<OtpRecord> {
  await initDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const expires_at = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord: OtpRecord = {
    id,
    email: normalizedEmail,
    otp_hash: otpHash,
    type,
    expires_at,
    attempts: 0,
    is_used: false,
    created_at: now,
  };

  if (isPgAvailable && pool) {
    try {
      // Invalidate previous unused OTPs for this email and type
      await pool.query(
        "UPDATE otps SET is_used = TRUE WHERE LOWER(email) = LOWER($1) AND type = $2 AND is_used = FALSE",
        [normalizedEmail, type]
      );

      const res = await pool.query<OtpRecord>(
        `INSERT INTO otps (id, email, otp_hash, type, expires_at, attempts, is_used, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, normalizedEmail, otpHash, type, expires_at, 0, false, now]
      );
      return res.rows[0];
    } catch (err) {
      console.error("DB error in createSecureOtp:", err);
    }
  }

  // Invalidate previous in-memory OTPs
  for (const [key, item] of memoryStore.otps.entries()) {
    if (item.email.toLowerCase() === normalizedEmail && item.type === type) {
      item.is_used = true;
      memoryStore.otps.set(key, item);
    }
  }

  memoryStore.otps.set(id, otpRecord);
  return otpRecord;
}

/**
 * Verifies the entered OTP against the stored hash.
 * Enforces:
 * - 5-minute expiration
 * - Maximum 5 attempts
 * - Immediate invalidation upon successful verification
 */
export async function verifySecureOtp(
  email: string,
  otp: string,
  type = "SIGNUP_VERIFY"
): Promise<{
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
  isLocked?: boolean;
  isExpired?: boolean;
}> {
  await initDb();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();
  const MAX_ATTEMPTS = 5;

  let activeRecord: OtpRecord | null = null;

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<OtpRecord>(
        `SELECT * FROM otps 
         WHERE LOWER(email) = LOWER($1) 
           AND type = $2 
           AND is_used = FALSE 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [normalizedEmail, type]
      );
      if (res.rows.length > 0) {
        activeRecord = res.rows[0];
      }
    } catch (err) {
      console.error("DB error fetching OTP:", err);
    }
  } else {
    // Memory store lookup
    for (const item of memoryStore.otps.values()) {
      if (item.email.toLowerCase() === normalizedEmail && item.type === type && !item.is_used) {
        if (!activeRecord || new Date(item.created_at) > new Date(activeRecord.created_at)) {
          activeRecord = item;
        }
      }
    }
  }

  if (!activeRecord) {
    return {
      valid: false,
      error: "No active verification code found. Please request a new code.",
    };
  }

  // Check 5-minute expiration
  if (new Date(activeRecord.expires_at).getTime() <= now.getTime()) {
    // Invalidate expired record
    await markOtpUsed(activeRecord.id);
    return {
      valid: false,
      error: "Verification code has expired (5-minute limit). Please request a new code.",
      isExpired: true,
    };
  }

  // Check if maximum attempts already exceeded
  if (activeRecord.attempts >= MAX_ATTEMPTS) {
    await markOtpUsed(activeRecord.id);
    return {
      valid: false,
      error: "Maximum verification attempts exceeded. This code has been locked. Please request a new code.",
      isLocked: true,
      attemptsRemaining: 0,
    };
  }

  // Increment attempt counter in DB
  const newAttempts = activeRecord.attempts + 1;
  await updateOtpAttempts(activeRecord.id, newAttempts);

  // Check OTP Hash match
  const isMatch = verifyOTPHash(otp, normalizedEmail, activeRecord.otp_hash);

  if (isMatch) {
    // Success: invalidate OTP immediately so it cannot be reused
    await markOtpUsed(activeRecord.id);
    return { valid: true };
  }

  // Mismatch handling
  const attemptsRemaining = MAX_ATTEMPTS - newAttempts;
  if (attemptsRemaining <= 0) {
    await markOtpUsed(activeRecord.id);
    return {
      valid: false,
      error: "Incorrect verification code. Maximum attempts reached. This code is now locked. Please request a new code.",
      isLocked: true,
      attemptsRemaining: 0,
    };
  }

  return {
    valid: false,
    error: `Incorrect verification code. ${attemptsRemaining} attempt(s) remaining.`,
    attemptsRemaining,
  };
}

async function markOtpUsed(id: string) {
  if (isPgAvailable && pool) {
    try {
      await pool.query("UPDATE otps SET is_used = TRUE WHERE id = $1", [id]);
    } catch (err) {
      console.error("DB error in markOtpUsed:", err);
    }
  } else {
    const item = memoryStore.otps.get(id);
    if (item) {
      item.is_used = true;
      memoryStore.otps.set(id, item);
    }
  }
}

async function updateOtpAttempts(id: string, attempts: number) {
  if (isPgAvailable && pool) {
    try {
      await pool.query("UPDATE otps SET attempts = $1 WHERE id = $2", [attempts, id]);
    } catch (err) {
      console.error("DB error in updateOtpAttempts:", err);
    }
  } else {
    const item = memoryStore.otps.get(id);
    if (item) {
      item.attempts = attempts;
      memoryStore.otps.set(id, item);
    }
  }
}
