const STORAGE_KEY = "officer_session";
const LAST_ACTIVITY_KEY = "officer_last_activity";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const _TOKEN_WINDOW_DAYS = parseInt(
  (import.meta.env["VITE_OFFICER_TOKEN_WINDOW_DAYS"] as string | undefined) ?? "7",
  10,
) || 7;
export const TOKEN_EXPIRY_MS = _TOKEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function parseIssuedAt(token: string): number | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;
  const n = parseInt(token.slice(0, dotIdx), 10);
  return isFinite(n) ? n : null;
}

export function getOfficerToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setOfficerToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  setLastActivity();
}

export function clearOfficerToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isOfficerAuthenticated(): boolean {
  return !!getOfficerToken();
}

export function officerAuthHeaders(): Record<string, string> {
  const token = getOfficerToken();
  return token ? { "x-officer-token": token } : {};
}

export function setLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivity(): number {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return Date.now();
  const n = Number(raw);
  return isFinite(n) ? n : Date.now();
}

export function isSessionExpired(): boolean {
  if (!getOfficerToken()) return false;
  return Date.now() - getLastActivity() > INACTIVITY_TIMEOUT_MS;
}

export function isTokenExpired(): boolean {
  const token = getOfficerToken();
  if (!token) return false;
  const issuedAt = parseIssuedAt(token);
  if (issuedAt === null) {
    return true;
  }
  return Date.now() - issuedAt > TOKEN_EXPIRY_MS;
}

const EXPIRY_WARNING_MS = 24 * 60 * 60 * 1000;

export function isTokenExpiringSoon(): boolean {
  const token = getOfficerToken();
  if (!token) return false;
  const issuedAt = parseIssuedAt(token);
  if (issuedAt === null) return false;
  const age = Date.now() - issuedAt;
  return age > TOKEN_EXPIRY_MS - EXPIRY_WARNING_MS && age <= TOKEN_EXPIRY_MS;
}

export function getTokenRemainingMs(): number | null {
  const token = getOfficerToken();
  if (!token) return null;
  const issuedAt = parseIssuedAt(token);
  if (issuedAt === null) return null;
  const remaining = TOKEN_EXPIRY_MS - (Date.now() - issuedAt);
  return remaining > 0 ? remaining : 0;
}

export { INACTIVITY_TIMEOUT_MS };
