"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { fetchUser, login as loginApi, logout as logoutApi } from "@/app/api/auth/AuthApi";

// Context shape
const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await fetchUser();
        setUser(userData);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => {
    loginApi();
  };

  const logout = () => {
    logoutApi();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using context
export function useAuth() {
  return useContext(AuthContext);
}

