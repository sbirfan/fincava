// Retail route barrel — mounts all /api/retail/* sub-routers.
// Sprint 2 adds: auth, catalog
// Sprint 3 adds: orders, webhooks, waitlist

import { Router, type IRouter } from "express";

const router: IRouter = Router();

import authRouter from "./auth";
import catalogRouter from "./catalog";
import ordersRouter from "./orders";
import adminOrdersRouter from "./adminOrders";
import cartRouter from "./cart";

router.use(authRouter);
router.use(catalogRouter);
router.use(ordersRouter);
router.use(adminOrdersRouter);
router.use(cartRouter);

export default router;
