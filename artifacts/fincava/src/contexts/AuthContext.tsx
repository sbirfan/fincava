import React, { createContext, useContext } from "react";
import { UserWithProfile, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: UserWithProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserWithProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: me, isLoading: isLoadingMe } = useGetMe({
    query: {
      enabled: true,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = (_token: string, user: UserWithProfile) => {
    queryClient.setQueryData(getGetMeQueryKey(), user);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore network errors — still clear local state
    }
    queryClient.clear();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user: me ?? null,
        isAuthenticated: !!me,
        isLoading: isLoadingMe,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
