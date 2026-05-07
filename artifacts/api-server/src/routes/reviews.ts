import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable, profilesTable, productsTable } from "@workspace/db";
import {
  ListProductReviewsParams,
  CreateReviewParams,
  CreateReviewBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { sendError } from "../lib/response";

const router: IRouter = Router();

router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const params = ListProductReviewsParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.productId, params.data.id));

  const reviewsWithAuthor = await Promise.all(reviews.map(async (r) => {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, r.authorId));
    return {
      id: r.id,
      authorId: r.authorId,
      authorName: profile ? `${profile.firstName} ${profile.lastName}` : "Anonymous",
      authorCountry: profile?.country ?? null,
      productId: r.productId,
      rating: r.rating,
      comment: r.comment ?? null,
      verified: r.verified,
      createdAt: r.createdAt.toISOString(),
    };
  }));

  res.json(reviewsWithAuthor);
});

router.post("/products/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) {
    sendError(res, 400, params.error.message);
    return;
  }

  const userId = req.userId;
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.message);
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    sendError(res, 404, "Product not found");
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    authorId: userId,
    productId: params.data.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
    verified: false,
  }).returning();

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));

  res.status(201).json({
    id: review.id,
    authorId: review.authorId,
    authorName: profile ? `${profile.firstName} ${profile.lastName}` : "Anonymous",
    authorCountry: profile?.country ?? null,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment ?? null,
    verified: review.verified,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
