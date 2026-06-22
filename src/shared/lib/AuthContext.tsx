"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import { fetchCurrentUser, loginUser, registerUser } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getCookie("auth_token");
      if (token) {
        try {
          const res = await fetchCurrentUser();
          setUser(res.user);
        } catch (error) {
          console.error("Failed to load user:", error);
          deleteCookie("auth_token");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: any) => {
    const res = await loginUser(data);
    setCookie("auth_token", res.token, { maxAge: 60 * 60 * 24 * 7 }); // 7 days
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await registerUser(data);
    setCookie("auth_token", res.token, { maxAge: 60 * 60 * 24 * 7 });
    setUser(res.user);
  };

  const logout = () => {
    deleteCookie("auth_token");
    deleteCookie("bugbusters_github_session"); // Also clear github session on logout
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
