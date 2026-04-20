import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../lib/auth";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as any).userRole;
  if (role !== "ADMIN") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

export const adminOnly = [requireAuth, requireAdmin] as const;
