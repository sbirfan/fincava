const STORAGE_KEY = "officer_session";
const LAST_ACTIVITY_KEY = "officer_last_activity";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

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

export { INACTIVITY_TIMEOUT_MS };
