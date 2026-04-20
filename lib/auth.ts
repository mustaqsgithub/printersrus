import { getDb } from "./db";
import crypto from "crypto";

const PASSWORD_ITERATIONS = 120000;
const SESSION_TTL_DAYS = 30;

export interface DbUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  email_verified_at: Date | null;
  email_notifications: number;
  created_at: Date;
}

export interface DbUserWithPassword extends DbUser {
  password_hash: string;
}

export const toAuthUser = (user: DbUser) => ({
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  phone: user.phone || undefined,
  role: user.role,
  emailVerified: Boolean(user.email_verified_at),
  emailNotifications: Boolean(user.email_notifications ?? 1),
  dateJoined: new Date(user.created_at).toISOString(),
});

export const createPasswordHash = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, "sha256")
    .toString("hex");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
};

export const verifyPassword = (storedHash: string, password: string) => {
  const [scheme, iterations, salt, hash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) {
    return false;
  }
  const derived = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
};

export const createUser = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?, 'customer')
  `).run(id, input.firstName, input.lastName, normalizedEmail, input.phone || null, passwordHash);

  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser;
};

export const getUserByEmail = async (email: string) => {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  return (db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, password_hash, created_at
    FROM users WHERE LOWER(email) = ?
  `).get(normalizedEmail) as DbUserWithPassword) || null;
};

export const getUserById = async (id: string) => {
  const db = getDb();
  return (db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser) || null;
};

export const listUsers = async () => {
  const db = getDb();
  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users ORDER BY created_at DESC
  `).all() as DbUser[];
};

export const updateUser = async (
  id: string,
  updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    emailVerifiedAt?: Date | null;
    role?: string;
  }
) => {
  const db = getDb();
  const fields: string[] = [];
  const values: Array<string | null> = [];

  if (updates.firstName !== undefined) {
    fields.push("first_name = ?");
    values.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    fields.push("last_name = ?");
    values.push(updates.lastName);
  }
  if (updates.email !== undefined) {
    fields.push("email = ?");
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone || null);
  }
  if (updates.emailVerifiedAt !== undefined) {
    fields.push("email_verified_at = ?");
    values.push(updates.emailVerifiedAt ? updates.emailVerifiedAt.toISOString() : null);
  }
  if (updates.role !== undefined) {
    fields.push("role = ?");
    values.push(updates.role);
  }

  if (fields.length === 0) {
    return getUserById(id);
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...values);

  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser;
};

const hashSessionToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString());
  return { token, expiresAt };
};

export const getSessionUser = async (token: string) => {
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  return (db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.email_verified_at, u.email_notifications, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ?
      AND s.expires_at > datetime('now')
    LIMIT 1
  `).get(tokenHash) as DbUser) || null;
};

export const deleteSession = async (token: string) => {
  const db = getDb();
  const tokenHash = hashSessionToken(token);
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
};

const createTokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createEmailVerificationToken = async (userId: string) => {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  db.prepare(`DELETE FROM email_verification_tokens WHERE user_id = ?`).run(userId);
  db.prepare(`
    INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString());
  return { token, expiresAt };
};

export const verifyEmailToken = async (token: string) => {
  const db = getDb();
  const tokenHash = createTokenHash(token);
  const record = db.prepare(`
    SELECT user_id, expires_at
    FROM email_verification_tokens
    WHERE token_hash = ?
    LIMIT 1
  `).get(tokenHash) as any;

  if (!record || new Date(record.expires_at) < new Date()) {
    return null;
  }

  const user = await updateUser(record.user_id, { emailVerifiedAt: new Date() });
  db.prepare(`DELETE FROM email_verification_tokens WHERE token_hash = ?`).run(tokenHash);
  return user;
};

export const createPasswordResetToken = async (userId: string) => {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(userId);
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString());
  return { token, expiresAt };
};

export const resetPasswordWithToken = async (token: string, password: string) => {
  const db = getDb();
  const tokenHash = createTokenHash(token);
  const record = db.prepare(`
    SELECT user_id, expires_at
    FROM password_reset_tokens
    WHERE token_hash = ?
    LIMIT 1
  `).get(tokenHash) as any;

  if (!record || new Date(record.expires_at) < new Date()) {
    return null;
  }

  const passwordHash = createPasswordHash(password);
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(passwordHash, record.user_id);
  db.prepare(`DELETE FROM password_reset_tokens WHERE token_hash = ?`).run(tokenHash);
  return getUserById(record.user_id);
};

export const isAdminRegistered = async () => {
  const db = getDb();
  const row = db.prepare(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`).get();
  return !!row;
};

export const createAdminUser = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, 'admin', ?)
  `).run(id, input.firstName, input.lastName, normalizedEmail, input.phone || null, passwordHash, now);

  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser;
};

export const updateUserPasswordAndRole = async (input: {
  email: string;
  password: string;
  role?: string;
  verifyEmail?: boolean;
}) => {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const role = input.role || "admin";
  const emailVerifiedAt = input.verifyEmail ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE users
    SET password_hash = ?,
        role = ?,
        email_verified_at = ?,
        updated_at = datetime('now')
    WHERE LOWER(email) = ?
  `).run(passwordHash, role, emailVerifiedAt, normalizedEmail);

  return (db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE LOWER(email) = ?
  `).get(normalizedEmail) as DbUser) || null;
};

export const createUserWithRole = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  verifyEmail?: boolean;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const role = input.role || "customer";
  const emailVerifiedAt = input.verifyEmail ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.firstName, input.lastName, normalizedEmail, input.phone || null, passwordHash, role, emailVerifiedAt);

  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser;
};

export const updateUserRole = async (id: string, role: string) => {
  const db = getDb();
  db.prepare(`
    UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?
  `).run(role, id);

  return (db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser) || null;
};

export const updateUserPasswordById = async (id: string, password: string) => {
  const db = getDb();
  const passwordHash = createPasswordHash(password);
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
  `).run(passwordHash, id);

  return (db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE id = ?
  `).get(id) as DbUser) || null;
};
