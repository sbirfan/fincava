import { vi, describe, it, expect, beforeEach } from "vitest";
import { computeFee, FEE_RATE, WAIVER_THRESHOLD } from "../services/fee-service";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────
// fee-service makes a single chained DB call:
//   db.select({ priorCount: count() }).from(ordersTable).where(...)
// We intercept the full chain and control what .where() resolves to.

const mockWhere = vi.hoisted(() => vi.fn());
const mockFrom  = vi.hoisted(() => vi.fn(() => ({ where: mockWhere })));
const mockSelect = vi.hoisted(() => vi.fn(() => ({ from: mockFrom })));

vi.mock("@workspace/db", () => ({
    db: { select: mockSelect },
    ordersTable: { buyerId: "buyer_id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn((...args: unknown[]) => args),
    eq:  vi.fn((col: unknown, val: unknown) => ({ col, val })),
    ne:  vi.fn((col: unknown, val: unknown) => ({ col, val })),
    count: vi.fn(() => "count_expr"),
}));

// ─── fee-service: constants ───────────────────────────────────────────────────

describe("fee-service constants", () => {
    it("FEE_RATE is 4 %", () => {
        expect(FEE_RATE).toBe(0.04);
    });

    it("WAIVER_THRESHOLD is 10", () => {
        expect(WAIVER_THRESHOLD).toBe(10);
    });
});

// ─── fee-service: waiver window (first 10 orders) ────────────────────────────

describe("computeFee — waiver window", () => {
    beforeEach(() => {
        mockWhere.mockReset();
        mockFrom.mockClear();
        mockSelect.mockClear();
    });

    it("waives the fee on the very first order (priorCount = 0)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 0 }]);
        const result = await computeFee(1, 500);
        expect(result.feeStatus).toBe("WAIVED");
        expect(result.feeAmountUSD).toBe(0);
        expect(result.feePercentage).toBe(4);
    });

    it("still waives the fee on the 5th order (priorCount = 4)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 4 }]);
        const result = await computeFee(1, 1000);
        expect(result.feeStatus).toBe("WAIVED");
        expect(result.feeAmountUSD).toBe(0);
    });

    it("waives the fee on the 10th order — last free slot (priorCount = 9)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 9 }]);
        const result = await computeFee(1, 800);
        expect(result.feeStatus).toBe("WAIVED");
        expect(result.feeAmountUSD).toBe(0);
    });
});

// ─── fee-service: fee kicks in after waiver window ────────────────────────────

describe("computeFee — fee active (after 10 orders)", () => {
    beforeEach(() => {
        mockWhere.mockReset();
    });

    it("charges 4 % on the 11th order (priorCount = 10)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 10 }]);
        const result = await computeFee(1, 1000);
        expect(result.feeStatus).toBe("PENDING");
        expect(result.feeAmountUSD).toBe(40);
        expect(result.feePercentage).toBe(4);
    });

    it("rounds fee to 2 decimal places", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 15 }]);
        const result = await computeFee(1, 333.33);
        expect(result.feeAmountUSD).toBe(13.33);
    });

    it("returns PENDING with fee $0 when totalUSD is 0 (zero-value order)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 20 }]);
        const result = await computeFee(1, 0);
        expect(result.feeStatus).toBe("PENDING");
        expect(result.feeAmountUSD).toBe(0);
    });

    it("treats negative totalUSD as 0 (guard against bad input)", async () => {
        mockWhere.mockResolvedValue([{ priorCount: 20 }]);
        const result = await computeFee(1, -500);
        expect(result.feeAmountUSD).toBe(0);
        expect(result.feeStatus).toBe("PENDING");
    });
});
