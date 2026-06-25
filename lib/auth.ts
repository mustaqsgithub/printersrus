import { getDb } from "./db";
import crypto from "crypto";
import { ROLE_ADMIN, ROLE_SUPER_ADMIN, isStaffRole } from "./roles";

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
  const row = db
    .prepare(`SELECT 1 FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1`)
    .get();
  return !!row;
};

// Decide what role the bootstrap account should get. The owner is the super
// admin. Set SUPER_ADMIN_EMAIL in the environment to name the owner explicitly;
// only that address becomes super_admin (everyone else set up via the setup key
// becomes a regular admin). If SUPER_ADMIN_EMAIL is left unset, the first
// account created through the setup flow is treated as the owner.
export const resolveOwnerRole = (email: string): string => {
  const target = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!target) return ROLE_SUPER_ADMIN;
  return email.trim().toLowerCase() === target ? ROLE_SUPER_ADMIN : ROLE_ADMIN;
};

export const createAdminUser = async (input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = createPasswordHash(input.password);
  const now = new Date().toISOString();
  const role = input.role === ROLE_SUPER_ADMIN ? ROLE_SUPER_ADMIN : ROLE_ADMIN;

  db.prepare(`
    INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role, email_verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.firstName, input.lastName, normalizedEmail, input.phone || null, passwordHash, role, now);

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

// ---------------------------------------------------------------------------
// Staff management & admin invitations
// ---------------------------------------------------------------------------

// All staff accounts (admins + the owner). Used by the super-admin Staff panel.
export const listStaff = async () => {
  const db = getDb();
  return db.prepare(`
    SELECT id, first_name, last_name, email, phone, role, email_verified_at, email_notifications, created_at
    FROM users WHERE role IN ('admin', 'super_admin') ORDER BY created_at ASC
  `).all() as DbUser[];
};

export interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
}

// Pending = not yet accepted and not yet expired.
export const listPendingInvitations = async () => {
  const db = getDb();
  return db.prepare(`
    SELECT id, email, role, invited_by, expires_at, created_at
    FROM admin_invitations
    WHERE accepted_at IS NULL AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `).all() as AdminInvitation[];
};

const INVITE_TTL_DAYS = 7;

// Create (or refresh) an invitation for an email and return the raw token so
// the caller can build the link. Any earlier pending invite for the same email
// is replaced so a re-invite invalidates the old link.
export const createAdminInvitation = async (input: {
  email: string;
  invitedBy?: string | null;
  role?: string;
}) => {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(`DELETE FROM admin_invitations WHERE LOWER(email) = ? AND accepted_at IS NULL`).run(
    normalizedEmail
  );
  db.prepare(`
    INSERT INTO admin_invitations (id, email, token_hash, invited_by, role, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    normalizedEmail,
    tokenHash,
    input.invitedBy || null,
    input.role || ROLE_ADMIN,
    expiresAt.toISOString()
  );

  return { token, email: normalizedEmail, expiresAt };
};

// Look up a still-valid (unaccepted, unexpired) invitation by its raw token.
export const getValidInvitation = async (token: string) => {
  const db = getDb();
  const tokenHash = createTokenHash(token);
  const record = db.prepare(`
    SELECT id, email, role, expires_at, accepted_at
    FROM admin_invitations WHERE token_hash = ? LIMIT 1
  `).get(tokenHash) as
    | { id: string; email: string; role: string; expires_at: string; accepted_at: string | null }
    | undefined;

  if (!record || record.accepted_at || new Date(record.expires_at) < new Date()) {
    return null;
  }
  return record;
};

export const revokeInvitation = async (id: string) => {
  const db = getDb();
  db.prepare(`DELETE FROM admin_invitations WHERE id = ? AND accepted_at IS NULL`).run(id);
};

// Accept an invitation: validate the token, then either create a fresh staff
// account (with the invitee's chosen credentials) or, if they already have an
// account, simply promote it to admin. The token is single-use.
export const acceptAdminInvitation = async (input: {
  token: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) => {
  const db = getDb();
  const invitation = await getValidInvitation(input.token);
  if (!invitation) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const role = invitation.role === ROLE_SUPER_ADMIN ? ROLE_SUPER_ADMIN : ROLE_ADMIN;
  const existing = await getUserByEmail(invitation.email);

  let user: DbUser | null;
  let existingAccount = false;

  if (existing) {
    // Already registered (e.g. a former customer) — just upgrade the role and
    // mark the email verified. Their existing password is left untouched. Never
    // downgrade an existing super admin to a plain admin.
    existingAccount = true;
    const effectiveRole = existing.role === ROLE_SUPER_ADMIN ? ROLE_SUPER_ADMIN : role;
    db.prepare(`
      UPDATE users
      SET role = ?,
          email_verified_at = COALESCE(email_verified_at, ?),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(effectiveRole, new Date().toISOString(), existing.id);
    user = await getUserById(existing.id);
  } else {
    if (!input.firstName || !input.lastName || !input.password) {
      return { ok: false as const, reason: "missing_fields" as const };
    }
    user = await createUserWithRole({
      firstName: input.firstName,
      lastName: input.lastName,
      email: invitation.email,
      password: input.password,
      role,
      verifyEmail: true,
    });
  }

  db.prepare(`UPDATE admin_invitations SET accepted_at = datetime('now') WHERE id = ?`).run(
    invitation.id
  );

  return { ok: true as const, user, existingAccount };
};

// Demote a staff member back to a regular customer. Refuses to demote the last
// remaining super admin so the owner can never lock themselves out.
export const demoteStaff = async (id: string) => {
  const db = getDb();
  const target = await getUserById(id);
  if (!target || !isStaffRole(target.role)) {
    return { ok: false as const, reason: "not_staff" as const };
  }
  if (target.role === ROLE_SUPER_ADMIN) {
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin'`)
      .get() as { count: number };
    if (row.count <= 1) {
      return { ok: false as const, reason: "last_super_admin" as const };
    }
  }
  const user = await updateUserRole(id, "customer");
  return { ok: true as const, user };
};
