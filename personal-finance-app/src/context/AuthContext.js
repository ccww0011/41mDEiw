"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { fetchUser, login as loginApi, logout as logoutApi } from "@/hooks/useAuth";

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
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  console.log(user)

  const login = () => {
    loginApi();
  };

  const logout = () => {
    logoutApi();
    setUser(null);
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

