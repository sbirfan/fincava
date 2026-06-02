import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { ErrorBoundary } from "@/components/error-boundary";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary>
        <Navbar />
      </ErrorBoundary>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}
