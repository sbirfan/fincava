import { type ComponentType } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/app-layout";

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
  </div>
);

export function PrivateRoute({
  component: Component,
  roles,
  layout: Layout = AppLayout,
}: {
  component: ComponentType;
  roles?: string[];
  layout?: ComponentType<{ children: React.ReactNode }>;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.mustResetPassword) return <Redirect to="/force-reset-password" />;
  if (roles && user && !roles.includes(user.role)) return <Redirect to="/" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}
