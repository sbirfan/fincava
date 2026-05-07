import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission, type ObjectAclPolicy } from "../lib/objectAcl";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { sendError } from "../lib/response";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload. Requires authentication.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * After the upload completes, call POST /storage/uploads/confirm to register ownership.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Missing or invalid required fields");
    return;
  }

  const { contentType } = parsed.data;
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.includes(contentType)) {
    res.status(400).json({
      error: `Content type not allowed. Allowed types: ${ALLOWED_UPLOAD_CONTENT_TYPES.join(", ")}`,
    });
    return;
  }

  try {
    const { name, size } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "Error generating upload URL");
    sendError(res, 500, "Failed to generate upload URL");
  }
});

/**
 * POST /storage/uploads/confirm
 *
 * After the client has uploaded a file to the presigned URL, call this endpoint
 * to register the authenticated user as the owner of the object. This sets an
 * ACL policy on the file so that only the owner (and admins) can read it.
 */
router.post("/storage/uploads/confirm", requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const { objectPath } = req.body;

  if (!objectPath || typeof objectPath !== "string") {
    sendError(res, 400, "objectPath is required");
    return;
  }

  try {
    const aclPolicy: ObjectAclPolicy = {
      owner: String(userId),
      visibility: "private",
    };
    await objectStorageService.trySetObjectEntityAclPolicy(objectPath, aclPolicy);
    res.json({ success: true, objectPath });
  } catch (error) {
    logger.error({ err: error, userId, objectPath }, "Error setting object ACL policy");
    sendError(res, 500, "Failed to confirm upload");
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      sendError(res, 404, "File not found");
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    logger.error({ err: error }, "Error serving public object");
    sendError(res, 500, "Failed to serve public object");
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve private object entities. Requires authentication.
 * Admins can access any object. Other users must own the object (ACL check).
 * Objects uploaded before confirm() was called have no ACL and are denied.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId;
  const userRole = req.userRole;

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    if (userRole !== "ADMIN") {
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId: String(userId),
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        sendError(res, 403, "Access denied");
        return;
      }
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      logger.warn({ err: error }, "Object not found");
      sendError(res, 404, "Object not found");
      return;
    }
    logger.error({ err: error }, "Error serving object");
    sendError(res, 500, "Failed to serve object");
  }
});

export default router;
