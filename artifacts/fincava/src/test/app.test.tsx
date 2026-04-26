import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { TrustBadge } from "@/components/trust-badge";
import { ProductCard } from "@/components/product-card";
import { TooltipProvider } from "@/components/ui/tooltip";

// ─── TrustBadge component ─────────────────────────────────────────────────────

describe("TrustBadge", () => {
    function renderBadge(score: number) {
        return render(
            <TooltipProvider>
                <TrustBadge score={score} showLabel />
            </TooltipProvider>,
        );
    }

    it("shows score 30 as Basic tier", () => {
        renderBadge(30);
        expect(screen.getByText("30")).toBeInTheDocument();
        expect(screen.getByText("Basic")).toBeInTheDocument();
    });

    it("shows score 55 as Silver tier", () => {
        renderBadge(55);
        expect(screen.getByText("55")).toBeInTheDocument();
        expect(screen.getByText("Silver")).toBeInTheDocument();
    });

    it("shows score 75 as Gold tier", () => {
        renderBadge(75);
        expect(screen.getByText("75")).toBeInTheDocument();
        expect(screen.getByText("Gold")).toBeInTheDocument();
    });

    it("shows score 90 as Platinum tier", () => {
        renderBadge(90);
        expect(screen.getByText("90")).toBeInTheDocument();
        expect(screen.getByText("Platinum")).toBeInTheDocument();
    });

    it("renders score without label when showLabel is false", () => {
        render(
            <TooltipProvider>
                <TrustBadge score={72} />
            </TooltipProvider>,
        );
        expect(screen.getByText("72")).toBeInTheDocument();
        expect(screen.queryByText("Gold")).not.toBeInTheDocument();
    });
});

// ─── ProductCard component ────────────────────────────────────────────────────

const baseProduct = {
    id: 1,
    name: "Colombian Cacao",
    category: "Cacao",
    pricePerKgUSD: 8.5,
    minOrderKg: 100,
    supplierName: "Finca El Paraíso",
    avgRating: 4.8,
    featured: false,
    images: [] as string[],
    description: "",
    companyId: 10,
    slug: "colombian-cacao",
    status: "SELLABLE" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe("ProductCard", () => {
    function renderCard(overrides: Partial<typeof baseProduct> = {}) {
        const product = { ...baseProduct, ...overrides } as any;
        return render(
            <Router>
                <ProductCard product={product} />
            </Router>,
        );
    }

    it("renders product name, price, and minimum order", () => {
        renderCard();
        expect(screen.getByText("Colombian Cacao")).toBeInTheDocument();
        expect(screen.getByText("$8.50")).toBeInTheDocument();
        expect(screen.getByText("100 kg")).toBeInTheDocument();
    });

    it("shows 'No image' placeholder when images array is empty", () => {
        renderCard({ images: [] });
        expect(screen.getByText("No image")).toBeInTheDocument();
    });

    it("renders product image when images are provided", () => {
        renderCard({ images: ["https://example.com/cacao.jpg"] });
        const img = screen.getByRole("img", { name: /colombian cacao/i });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "https://example.com/cacao.jpg");
    });

    it("shows Featured badge when product.featured is true", () => {
        renderCard({ featured: true });
        expect(screen.getByText("Featured")).toBeInTheDocument();
    });

    it("does not show Featured badge when product.featured is false", () => {
        renderCard({ featured: false });
        expect(screen.queryByText("Featured")).not.toBeInTheDocument();
    });

    it("shows supplier name when farmerName is absent", () => {
        renderCard({ supplierName: "Finca El Paraíso" });
        expect(screen.getByText("Finca El Paraíso")).toBeInTheDocument();
    });

    it("shows farmer and farm name when present", () => {
        renderCard({ farmerName: "Carlos Ruiz", farmName: "La Esperanza" } as any);
        expect(screen.getByText(/Carlos Ruiz/)).toBeInTheDocument();
        expect(screen.getByText(/La Esperanza/)).toBeInTheDocument();
    });

    it("shows rating when avgRating is set", () => {
        renderCard({ avgRating: 4.8 });
        expect(screen.getByText("4.8")).toBeInTheDocument();
    });

    it("shows 'New' when avgRating is null", () => {
        renderCard({ avgRating: null as any });
        expect(screen.getByText("New")).toBeInTheDocument();
    });
});
