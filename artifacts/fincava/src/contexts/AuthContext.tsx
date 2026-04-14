import React, { createContext, useContext, useEffect, useState } from "react";
import { UserWithProfile, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { getToken, setToken as setLocalToken, clearToken as clearLocalToken } from "../lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: UserWithProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserWithProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [storedUser, setStoredUser] = useState<UserWithProfile | null>(null);
  const queryClient = useQueryClient();

  const { data: me, isLoading: isLoadingMe } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (token) {
      setLocalToken(token);
    } else {
      clearLocalToken();
      setStoredUser(null);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserWithProfile) => {
    setToken(newToken);
    setStoredUser(newUser);
  };

  const logout = () => {
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  };

  const user = me ?? storedUser ?? null;
  const isLoading = !!token && isLoadingMe && !user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
