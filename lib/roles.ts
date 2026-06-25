// Role constants and pure helpers. This module must stay free of any
// server-only imports (no database, no next/headers) so it can be imported
// from both API routes and client components.

export const ROLE_CUSTOMER = "customer";
export const ROLE_ADMIN = "admin";
export const ROLE_SUPER_ADMIN = "super_admin";

// Staff = anyone who can use the admin console (day-to-day store work).
export const isStaffRole = (role?: string | null): boolean =>
  role === ROLE_ADMIN || role === ROLE_SUPER_ADMIN;

// Super admin = the owner; the only role allowed to manage staff/roles.
export const isSuperAdminRole = (role?: string | null): boolean =>
  role === ROLE_SUPER_ADMIN;
