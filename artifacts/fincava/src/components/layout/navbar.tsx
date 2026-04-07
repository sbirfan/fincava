import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-serif text-2xl font-bold text-primary">Fincava</span>
        </Link>
        
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/marketplace" className="transition-colors hover:text-primary">
            Marketplace
          </Link>
          <Link href="/suppliers" className="transition-colors hover:text-primary">
            Suppliers
          </Link>
          <Link href="/markets" className="transition-colors hover:text-primary">
            Markets
          </Link>
          <Link href="/rfqs" className="transition-colors hover:text-primary">
            RFQs
          </Link>
          <Link href="/origin-stories" className="transition-colors hover:text-primary">
            Origin Stories
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link href={user?.role === 'SUPPLIER' ? '/supplier-dashboard' : '/dashboard'} className="text-sm font-medium hover:underline">
                Dashboard
              </Link>
              <Button variant="outline" onClick={() => logout()}>Log out</Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:underline">
                Log in
              </Link>
              <Link href="/register">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
