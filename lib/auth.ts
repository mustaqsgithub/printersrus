import { sql } from "@vercel/postgres";
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
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  await sql`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role)
    VALUES (
      ${id},
      ${input.firstName},
      ${input.lastName},
      ${normalizedEmail},
      ${input.phone || null},
      ${passwordHash},
      'customer'
    )
  `;
  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0] as DbUser;
};

export const getUserByEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, password_hash, created_at
    FROM users
    WHERE LOWER(email) = ${normalizedEmail}
  `;
  return (result.rows[0] as DbUserWithPassword) || null;
};

export const getUserById = async (id: string) => {
  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0] as DbUser | null;
};

export const listUsers = async () => {
  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return result.rows as DbUser[];
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
  const fields: string[] = [];
  const values: Array<string | null | Date> = [];
  let paramIndex = 1;

  if (updates.firstName !== undefined) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(updates.lastName);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone || null);
  }
  if (updates.emailVerifiedAt !== undefined) {
    fields.push(`email_verified_at = $${paramIndex++}`);
    values.push(updates.emailVerifiedAt);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }

  if (fields.length === 0) {
    return getUserById(id);
  }

  values.push(id);
  const query = `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, first_name, last_name, email, phone, role, email_verified_at, created_at`;
  const result = await sql.query(query, values);
  return result.rows[0] as DbUser;
};

const hashSessionToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
};

export const getSessionUser = async (token: string) => {
  const tokenHash = hashSessionToken(token);
  const result = await sql`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.email_verified_at, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1
  `;
  return result.rows[0] as DbUser | null;
};

export const deleteSession = async (token: string) => {
  const tokenHash = hashSessionToken(token);
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
};

const createTokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createEmailVerificationToken = async (userId: string) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
    VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
};

export const verifyEmailToken = async (token: string) => {
  const tokenHash = createTokenHash(token);
  const result = await sql`
    SELECT user_id, expires_at
    FROM email_verification_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;
  const record = result.rows[0];
  if (!record || new Date(record.expires_at) < new Date()) {
    return null;
  }

  const user = await updateUser(record.user_id, { emailVerifiedAt: new Date() });
  await sql`DELETE FROM email_verification_tokens WHERE token_hash = ${tokenHash}`;
  return user;
};

export const createPasswordResetToken = async (userId: string) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
    VALUES (${crypto.randomUUID()}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
};

export const resetPasswordWithToken = async (token: string, password: string) => {
  const tokenHash = createTokenHash(token);
  const result = await sql`
    SELECT user_id, expires_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;
  const record = result.rows[0];
  if (!record || new Date(record.expires_at) < new Date()) {
    return null;
  }

  const passwordHash = createPasswordHash(password);
  await sql`
    UPDATE users SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${record.user_id}
  `;
  await sql`DELETE FROM password_reset_tokens WHERE token_hash = ${tokenHash}`;
  return getUserById(record.user_id);
};

export const isAdminRegistered = async () => {
  const result = await sql`
    SELECT 1 FROM users WHERE role = 'admin' LIMIT 1
  `;
  return result.rows.length > 0;
};

export const createAdminUser = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const now = new Date();

  await sql`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified_at)
    VALUES (
      ${id},
      ${input.firstName},
      ${input.lastName},
      ${normalizedEmail},
      ${input.phone || null},
      ${passwordHash},
      'admin',
      ${now.toISOString()}
    )
  `;

  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0] as DbUser;
};

export const updateUserPasswordAndRole = async (input: {
  email: string;
  password: string;
  role?: string;
  verifyEmail?: boolean;
}) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const role = input.role || "admin";
  const emailVerifiedAt = input.verifyEmail ? new Date().toISOString() : null;

  const result = await sql`
    UPDATE users
    SET password_hash = ${passwordHash},
        role = ${role},
        email_verified_at = ${emailVerifiedAt},
        updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(email) = ${normalizedEmail}
    RETURNING id, first_name, last_name, email, phone, role, email_verified_at, created_at
  `;
  return (result.rows[0] as DbUser) || null;
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
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const role = input.role || "customer";
  const emailVerifiedAt = input.verifyEmail ? new Date().toISOString() : null;

  await sql`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified_at)
    VALUES (
      ${id},
      ${input.firstName},
      ${input.lastName},
      ${normalizedEmail},
      ${input.phone || null},
      ${passwordHash},
      ${role},
      ${emailVerifiedAt}
    )
  `;

  const result = await sql`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0] as DbUser;
};

export const updateUserRole = async (id: string, role: string) => {
  const result = await sql`
    UPDATE users
    SET role = ${role}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, first_name, last_name, email, phone, role, email_verified_at, created_at
  `;
  return (result.rows[0] as DbUser) || null;
};

export const updateUserPasswordById = async (id: string, password: string) => {
  const passwordHash = createPasswordHash(password);
  const result = await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, first_name, last_name, email, phone, role, email_verified_at, created_at
  `;
  return (result.rows[0] as DbUser) || null;
};
