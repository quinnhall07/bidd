// Pure helpers (no imports) so unit tests can load this file directly.

const EMAIL = /^([a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/;

/**
 * Lowercases and trims an address and checks its shape. ASCII only, exactly one "@".
 * Returns null when it isn't a plausible address.
 */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254) return null;
  const match = EMAIL.exec(email);
  if (!match || (match[1] ?? "").length > 64) return null;
  return email;
}

/** The exact domain after the "@". Pass a normalized address. */
export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}
