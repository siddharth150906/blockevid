import { Pool } from "pg";
import crypto from "crypto";

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
  otp_code: string;
  type: string;
  expires_at: Date | string;
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
    console.info("[BlockEvid DB] No DATABASE_URL provided. Operating with in-memory resilient storage.");
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
          otp_code VARCHAR(10) NOT NULL,
          type VARCHAR(50) DEFAULT 'SIGNUP_VERIFY',
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
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

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
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
    console.warn(`[BlockEvid DB] PostgreSQL connection failed (${err.message}). Using in-memory storage fallback.`);
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

// OTP Queries
export async function createOtp(email: string, otp_code: string, type = "SIGNUP_VERIFY", expiresInMinutes = 10): Promise<OtpRecord> {
  await initDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const expires_at = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord: OtpRecord = {
    id,
    email: normalizedEmail,
    otp_code,
    type,
    expires_at,
    is_used: false,
    created_at: now,
  };

  if (isPgAvailable && pool) {
    try {
      // Invalidate previous OTPs of this type for this email
      await pool.query(
        "UPDATE otps SET is_used = TRUE WHERE LOWER(email) = LOWER($1) AND type = $2 AND is_used = FALSE",
        [normalizedEmail, type]
      );

      const res = await pool.query<OtpRecord>(
        `INSERT INTO otps (id, email, otp_code, type, expires_at, is_used, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, normalizedEmail, otp_code, type, expires_at, false, now]
      );
      return res.rows[0];
    } catch (err) {
      console.error("DB error in createOtp:", err);
    }
  }

  // Invalidate previous OTPs in memory
  for (const [key, item] of memoryStore.otps.entries()) {
    if (item.email.toLowerCase() === normalizedEmail && item.type === type) {
      item.is_used = true;
      memoryStore.otps.set(key, item);
    }
  }

  memoryStore.otps.set(id, otpRecord);
  return otpRecord;
}

export async function verifyAndConsumeOtp(email: string, otp_code: string, type = "SIGNUP_VERIFY"): Promise<boolean> {
  await initDb();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query<OtpRecord>(
        `SELECT * FROM otps 
         WHERE LOWER(email) = LOWER($1) 
           AND otp_code = $2 
           AND type = $3 
           AND is_used = FALSE 
           AND expires_at > $4 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [normalizedEmail, otp_code.trim(), type, now]
      );

      if (res.rows.length > 0) {
        const matched = res.rows[0];
        await pool.query("UPDATE otps SET is_used = TRUE WHERE id = $1", [matched.id]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("DB error in verifyAndConsumeOtp:", err);
    }
  }

  for (const [key, item] of memoryStore.otps.entries()) {
    if (
      item.email.toLowerCase() === normalizedEmail &&
      item.otp_code === otp_code.trim() &&
      item.type === type &&
      !item.is_used &&
      new Date(item.expires_at).getTime() > now.getTime()
    ) {
      item.is_used = true;
      memoryStore.otps.set(key, item);
      return true;
    }
  }

  return false;
}
