// reviewSuggestion.ts — Layer B route
// GET /api/admin/compliance/requirements/:id/ai-suggestion
// Admin-only. Returns a cached or fresh AI review recommendation for a requirement.

import { Router, type IRouter, type Request, type Response } from "express";
import { adminOnly } from "../middleware/admin";
import { sendError } from "../lib/response";
import { logger } from "../lib/logger";
import { getReviewSuggestion } from "../services/review-suggestion-service";

const router: IRouter = Router();

router.get(
  "/admin/compliance/requirements/:id/ai-suggestion",
  ...adminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const requirementId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(requirementId)) {
      sendError(res, 400, "Invalid requirementId");
      return;
    }

    try {
      const suggestion = await getReviewSuggestion(requirementId);
      res.json(suggestion);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("not found")) {
        sendError(res, 404, message);
        return;
      }
      logger.error({ requirementId, err }, "review-suggestion: GET failed (Layer B)");
      sendError(res, 500, "Failed to generate review suggestion");
    }
  },
);

export default router;
