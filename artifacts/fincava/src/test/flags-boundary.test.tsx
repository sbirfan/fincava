// P2-R8: Frontend boundary tests.
//
// 1. Flags module — all three ENABLE_* constants default to false when the
//    corresponding VITE_* env vars are absent (the standard test environment).
// 2. PrivateRoute guard — redirects to /login when unauthenticated, redirects
//    to / when the authenticated user's role is not in the allowed list, and
//    renders the component when the role matches.

import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ENABLE_TRANSACTIONS, ENABLE_FINANCE, ENABLE_LOGISTICS } from "@/lib/flags";
import { PrivateRoute } from "@/components/private-route";

// ─── Mock dependencies of PrivateRoute ───────────────────────────────────────
// vi.mock factories are hoisted above all imports, so mockUseAuth must be
// created with vi.hoisted to be available when the factory executes.

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Redirect renders a visible marker so tests can assert where it points.
vi.mock("wouter", () => ({
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect-to">{to}</div>,
}));

// AppLayout is the default layout — stub it as a transparent wrapper.
vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(state: { isAuthenticated: boolean; isLoading: boolean; user: any }) {
  mockUseAuth.mockReturnValue(state);
}

const PassThrough = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DummyComponent = () => <div>Protected Content</div>;

// ═════════════════════════════════════════════════════════════════════════════
// 1. Frontend flags module — default values
// ═════════════════════════════════════════════════════════════════════════════

describe("Frontend flags module — defaults", () => {
  it("ENABLE_TRANSACTIONS defaults to false when VITE_ENABLE_TRANSACTIONS is not set", () => {
    expect(ENABLE_TRANSACTIONS).toBe(false);
  });

  it("ENABLE_FINANCE defaults to false when VITE_ENABLE_FINANCE is not set", () => {
    expect(ENABLE_FINANCE).toBe(false);
  });

  it("ENABLE_LOGISTICS defaults to false when VITE_ENABLE_LOGISTICS is not set", () => {
    expect(ENABLE_LOGISTICS).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. PrivateRoute — route guard behaviour
// ═════════════════════════════════════════════════════════════════════════════

describe("PrivateRoute — route guard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("redirects to /login when the user is not authenticated", () => {
    mockAuth({ isAuthenticated: false, isLoading: false, user: null });

    render(<PrivateRoute component={DummyComponent} roles={["BUYER"]} layout={PassThrough} />);

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect-to")).toHaveTextContent("/login");
  });

  it("redirects to / when a BUYER tries to access an ADMIN-only route", () => {
    mockAuth({ isAuthenticated: true, isLoading: false, user: { role: "BUYER" } });

    render(<PrivateRoute component={DummyComponent} roles={["ADMIN"]} layout={PassThrough} />);

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect-to")).toHaveTextContent("/");
  });

  it("redirects to / when a SUPPLIER tries to access a BUYER-only route", () => {
    mockAuth({ isAuthenticated: true, isLoading: false, user: { role: "SUPPLIER" } });

    render(<PrivateRoute component={DummyComponent} roles={["BUYER"]} layout={PassThrough} />);

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByTestId("redirect-to")).toHaveTextContent("/");
  });

  it("renders the protected component when the user's role is in the allowed list", () => {
    mockAuth({ isAuthenticated: true, isLoading: false, user: { role: "ADMIN" } });

    render(<PrivateRoute component={DummyComponent} roles={["ADMIN"]} layout={PassThrough} />);

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByTestId("redirect-to")).not.toBeInTheDocument();
  });

  it("renders the component when there are no role restrictions (any authenticated user)", () => {
    mockAuth({ isAuthenticated: true, isLoading: false, user: { role: "SUPPLIER" } });

    render(<PrivateRoute component={DummyComponent} layout={PassThrough} />);

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders the PageLoader while auth state is loading", () => {
    mockAuth({ isAuthenticated: false, isLoading: true, user: null });

    render(<PrivateRoute component={DummyComponent} roles={["BUYER"]} layout={PassThrough} />);

    // Protected content must not render during loading
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    // Redirect must not fire during loading
    expect(screen.queryByTestId("redirect-to")).not.toBeInTheDocument();
  });
});
