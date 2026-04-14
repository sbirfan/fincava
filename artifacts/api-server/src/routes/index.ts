import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import suppliersRouter from "./suppliers";
import inquiriesRouter from "./inquiries";
import ordersRouter from "./orders";
import statsRouter from "./stats";
import reviewsRouter from "./reviews";
import messagesRouter from "./messages";
import usersRouter from "./users";
import rfqsRouter from "./rfqs";
import shipmentsRouter from "./shipments";
import analyticsRouter from "./analytics";
import storiesRouter from "./stories";
import financingRouter from "./financing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(suppliersRouter);
router.use(inquiriesRouter);
router.use(ordersRouter);
router.use(statsRouter);
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(usersRouter);
router.use(rfqsRouter);
router.use(shipmentsRouter);
router.use(analyticsRouter);
router.use(storiesRouter);
router.use(financingRouter);

export default router;
