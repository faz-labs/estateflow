/**
 * Authentication & Super Admin Access Constants
 * Centralized source of truth for platform super-administrators.
 * Supports dynamic configuration via NEXT_PUBLIC_SUPER_ADMIN_EMAILS environment variable.
 */

export const DEFAULT_SUPER_ADMIN_EMAILS: readonly string[] = [
  'anonto.kings9@gmail.com',
  'admin@remotizedit.online',
  'estate.admin@remotizedit.online',
];

/**
 * Returns all configured super admin emails, combining default master accounts
 * with any extra emails specified in NEXT_PUBLIC_SUPER_ADMIN_EMAILS or SUPER_ADMIN_EMAILS.
 * Example in .env.local:
 * NEXT_PUBLIC_SUPER_ADMIN_EMAILS=partner@domain.com,ops@domain.com
 */
export function getSuperAdminEmails(): string[] {
  const envEmails =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAILS)) ||
    '';

  const dynamicList = envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const combined = [...DEFAULT_SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...dynamicList];
  return Array.from(new Set(combined));
}

/**
 * Checks if a given email is designated as a Platform Super Admin.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getSuperAdminEmails().includes(normalized);
}

// Export for backward compatibility
export const SUPER_ADMIN_EMAILS = getSuperAdminEmails();
