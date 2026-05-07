export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}
