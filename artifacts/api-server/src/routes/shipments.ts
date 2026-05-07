import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, shipmentsTable, paymentMilestonesTable, ordersTable, companiesTable
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { ENABLE_LOGISTICS } from "../lib/flags";
import { sendError } from "../lib/response";

const router: IRouter = Router();

router.use("/orders", (_req, res, next): void => {
  if (!ENABLE_LOGISTICS) { sendError(res, 404, "Not found"); return; }
  next();
});

router.get("/orders/:id/shipment", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.orderId, orderId));
  if (!shipment) { sendError(res, 404, "No shipment found for this order"); return; }

  res.json({
    ...shipment,
    eta: shipment.eta?.toISOString() ?? null,
    departedAt: shipment.departedAt?.toISOString() ?? null,
    arrivedAt: shipment.arrivedAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  });
});

router.post("/orders/:id/shipment", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const { originPort, destinationPort, carrier, trackingNumber, containerNumber, eta } = req.body;

  const [existing] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.orderId, orderId));
  if (existing) {
    const [updated] = await db.update(shipmentsTable)
      .set({ carrier, trackingNumber, containerNumber, eta: eta ? new Date(eta) : null, updatedAt: new Date() })
      .where(eq(shipmentsTable.orderId, orderId))
      .returning();
    res.json({ ...updated, eta: updated.eta?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
    return;
  }

  const [shipment] = await db.insert(shipmentsTable).values({
    orderId,
    originPort: originPort ?? "Cartagena, Colombia",
    destinationPort: destinationPort ?? "Unknown",
    carrier: carrier ?? null,
    trackingNumber: trackingNumber ?? null,
    containerNumber: containerNumber ?? null,
    eta: eta ? new Date(eta) : null,
    status: "BOOKED",
  }).returning();

  res.status(201).json({ ...shipment, eta: shipment.eta?.toISOString() ?? null, createdAt: shipment.createdAt.toISOString(), updatedAt: shipment.updatedAt.toISOString() });
});

router.patch("/orders/:id/shipment/status", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const { status } = req.body;
  const [updated] = await db.update(shipmentsTable).set({ status, updatedAt: new Date() }).where(eq(shipmentsTable.orderId, orderId)).returning();
  res.json({ ...updated, eta: updated.eta?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.get("/orders/:id/milestones", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const milestones = await db.select().from(paymentMilestonesTable).where(eq(paymentMilestonesTable.orderId, orderId));
  res.json(milestones.map(m => ({
    ...m,
    dueDate: m.dueDate?.toISOString() ?? null,
    releasedAt: m.releasedAt?.toISOString() ?? null,
  })));
});

router.post("/orders/:id/milestones", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  const { name, description, amountUSD, percentage, dueDate } = req.body;
  const [milestone] = await db.insert(paymentMilestonesTable).values({
    orderId,
    name,
    description: description ?? "",
    amountUSD: parseFloat(amountUSD),
    percentage: parseFloat(percentage),
    status: "PENDING",
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();
  res.status(201).json({ ...milestone, dueDate: milestone.dueDate?.toISOString() ?? null, releasedAt: null });
});

router.post("/orders/:orderId/milestones/:milestoneId/release", requireAuth, async (req, res): Promise<void> => {
  const milestoneId = parseInt(req.params.milestoneId as string);
  const [updated] = await db.update(paymentMilestonesTable)
    .set({ status: "RELEASED", releasedAt: new Date() })
    .where(eq(paymentMilestonesTable.id, milestoneId))
    .returning();
  res.json({ ...updated, dueDate: updated.dueDate?.toISOString() ?? null, releasedAt: updated.releasedAt?.toISOString() ?? null });
});

export default router;
