const STORAGE_KEY = "officer_session";

export function getOfficerToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setOfficerToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearOfficerToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isOfficerAuthenticated(): boolean {
  return !!getOfficerToken();
}

export function officerAuthHeaders(): Record<string, string> {
  const token = getOfficerToken();
  return token ? { "x-officer-token": token } : {};
}
