/**
 * Starter test suite for the FinCava frontend (fincava).
 *
 * These tests are intentionally lightweight so they run immediately
 * without requiring the full app to be mounted.
 *
 * As you build features, add component-level and integration tests
 * alongside each component file (e.g. Button.test.tsx next to Button.tsx).
 */
import { describe, it, expect } from "vitest";

// ─── Utility / pure-function tests ───────────────────────────────────────────

describe("FinCava frontend – sanity checks", () => {
    it("environment is jsdom (browser-like)", () => {
          expect(typeof window).toBe("object");
          expect(typeof document).toBe("object");
    });

           it("process.env.NODE_ENV is test", () => {
                 expect(process.env.NODE_ENV).toBe("test");
           });
});

// ─── Currency / number formatting helpers ─────────────────────────────────────
// Add your real utility imports here as you create them, e.g.:
//   import { formatCurrency } from "@/lib/utils";

describe("Number formatting utilities", () => {
    it("Intl.NumberFormat formats USD correctly", () => {
          const fmt = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
          });
          expect(fmt.format(1234567.89)).toBe("$1,234,567.89");
    });

           it("Intl.NumberFormat formats percentage correctly", () => {
                 const fmt = new Intl.NumberFormat("en-US", {
                         style: "percent",
                         minimumFractionDigits: 2,
                 });
                 expect(fmt.format(0.0525)).toBe("5.25%");
           });
});

// ─── Date formatting helpers ──────────────────────────────────────────────────

describe("Date utilities", () => {
    it("formats a date to ISO string without time", () => {
          const date = new Date("2026-01-15T12:00:00Z");
          const formatted = date.toISOString().split("T")[0];
          expect(formatted).toBe("2026-01-15");
    });
});

// ─── Component tests (add as you build) ──────────────────────────────────────
// Example pattern – uncomment and adapt once you have a component:
//
// import { render, screen } from "@testing-library/react";
// import { Button } from "@/components/ui/button";
//
// describe("Button component", () => {
//   it("renders with correct label", () => {
//     render(<Button>Apply for Loan</Button>);
//     expect(screen.getByRole("button", { name: /apply for loan/i })).toBeInTheDocument();
//   });
//
//   it("calls onClick when clicked", async () => {
//     const handleClick = vi.fn();
//     render(<Button onClick={handleClick}>Submit</Button>);
//     await userEvent.click(screen.getByRole("button"));
//     expect(handleClick).toHaveBeenCalledOnce();
//   });
// });
