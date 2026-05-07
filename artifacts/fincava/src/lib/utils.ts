import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveImageUrl(path: string): string {
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return path;
}

export function safeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:\/\/|\/)/.test(url)) return url;
  return undefined;
}
