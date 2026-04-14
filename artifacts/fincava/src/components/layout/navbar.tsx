import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/marketplace", label: "Products" },
  { href: "/platform", label: "Platform" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/markets", label: "Markets" },
  { href: "/impact", label: "Impact" },
  { href: "/investors", label: "Investors" },
];

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        {/* Brand */}
        <Link href="/" className="mr-8 flex items-center gap-2.5 shrink-0">
          <span className="font-serif text-2xl font-bold text-primary">Fincava</span>
          <span className="hidden sm:block text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full leading-tight tracking-wide border border-border">
            Commerce OS
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
          {NAV_LINKS.map(link => {
            const active = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  active
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth CTA */}
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href={user?.role === "SUPPLIER" ? "/supplier-dashboard" : "/dashboard"}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
