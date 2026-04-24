// Auth is handled via httpOnly cookies set by the server on login/register.
// The token is never stored in the browser (localStorage/sessionStorage)
// to prevent XSS-based token theft.
export const getToken = (): string | null => null;
export const setToken = (_token: string): void => {};
export const clearToken = (): void => {};
