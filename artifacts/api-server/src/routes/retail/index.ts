// Retail route barrel — mounts all /api/retail/* sub-routers.
// Sprint 2 adds: auth, catalog
// Sprint 3 adds: orders, webhooks, waitlist

import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Sub-routers are imported and mounted here as each sprint completes.
// Placeholder: router is exported empty so the mount in routes/index.ts
// compiles and the /api/retail prefix is reserved.

export default router;
