import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db, shipmentsTable, paymentMilestonesTable, ordersTable, companiesTable, orderItemsTable, productsTable
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { ENABLE_LOGISTICS } from "../lib/flags";
import { sendError } from "../lib/response";

const router: IRouter = Router();

router.use("/orders", (_req, res, next): void => {
  if (!ENABLE_LOGISTICS) { sendError(res, 404, "Not found"); return; }
  next();
});

/**
 * Verifies that the authenticated user is the buyer of the order, a supplier
 * who has at least one item in the order, or an admin.
 * Returns { authorized, notFound } to let callers respond appropriately.
 */
async function verifyOrderAccess(
  orderId: number,
  userId: number,
  userRole: string,
): Promise<{ authorized: boolean; notFound?: boolean }> {
  if (userRole === "ADMIN") return { authorized: true };

  const [order] = await db.select({ id: ordersTable.id, buyerId: ordersTable.buyerId })
    .from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return { authorized: false, notFound: true };

  // Buyer owns the order
  if (order.buyerId === userId) return { authorized: true };

  // Supplier: check if they have at least one product among the order items
  const [company] = await db.select({ id: companiesTable.id })
    .from(companiesTable).where(eq(companiesTable.userId, userId));
  if (!company) return { authorized: false };

  const supplierProducts = await db.select({ id: productsTable.id })
    .from(productsTable).where(eq(productsTable.companyId, company.id));
  if (supplierProducts.length === 0) return { authorized: false };

  const supplierProductIds = supplierProducts.map(p => p.id);

  const itemsInOrder = await db
    .select({ productId: orderItemsTable.productId })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  const isParticipant = itemsInOrder.some(i => supplierProductIds.includes(i.productId));
  return { authorized: isParticipant };
}

router.get("/orders/:id/shipment", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to access this order's shipment"); return; }

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
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to access this order's shipment"); return; }

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
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to update this order's shipment"); return; }

  const { status } = req.body;
  const [updated] = await db.update(shipmentsTable).set({ status, updatedAt: new Date() }).where(eq(shipmentsTable.orderId, orderId)).returning();
  if (!updated) { sendError(res, 404, "No shipment found for this order"); return; }
  res.json({ ...updated, eta: updated.eta?.toISOString() ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.get("/orders/:id/milestones", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to access this order's milestones"); return; }

  const milestones = await db.select().from(paymentMilestonesTable).where(eq(paymentMilestonesTable.orderId, orderId));
  res.json(milestones.map(m => ({
    ...m,
    dueDate: m.dueDate?.toISOString() ?? null,
    releasedAt: m.releasedAt?.toISOString() ?? null,
  })));
});

router.post("/orders/:id/milestones", requireAuth, async (req, res): Promise<void> => {
  const orderId = parseInt(req.params.id as string);
  if (isNaN(orderId)) { sendError(res, 400, "Invalid order id"); return; }

  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to access this order's milestones"); return; }

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
  const orderId = parseInt(req.params.orderId as string);
  const milestoneId = parseInt(req.params.milestoneId as string);
  if (isNaN(orderId) || isNaN(milestoneId)) { sendError(res, 400, "Invalid id"); return; }

  // Verify ownership of the parent order before releasing any milestone
  const access = await verifyOrderAccess(orderId, req.userId, req.userRole);
  if (access.notFound) { sendError(res, 404, "Order not found"); return; }
  if (!access.authorized) { sendError(res, 403, "Not authorized to release milestones on this order"); return; }

  // Ensure the milestone actually belongs to this order (prevents cross-order milestone tampering)
  const [existing] = await db.select({ id: paymentMilestonesTable.id, orderId: paymentMilestonesTable.orderId })
    .from(paymentMilestonesTable)
    .where(eq(paymentMilestonesTable.id, milestoneId));
  if (!existing || existing.orderId !== orderId) {
    sendError(res, 404, "Milestone not found on this order"); return;
  }

  const [updated] = await db.update(paymentMilestonesTable)
    .set({ status: "RELEASED", releasedAt: new Date() })
    .where(eq(paymentMilestonesTable.id, milestoneId))
    .returning();
  res.json({ ...updated, dueDate: updated.dueDate?.toISOString() ?? null, releasedAt: updated.releasedAt?.toISOString() ?? null });
});

export default router;
