import { createContext, useContext, useEffect, useState } from "react";
import type { User, AuthResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(
    localStorage.getItem("accessToken")
  );
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from stored token
  useEffect(() => {
    if (accessToken) {
      // Verify token by fetching current user
      fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.id) {
            setUser(data);
          } else {
            localStorage.removeItem("accessToken");
            setAccessTokenState(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("accessToken");
          setAccessTokenState(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const setAccessToken = (token: string) => {
    setAccessTokenState(token);
    localStorage.setItem("accessToken", token);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data: AuthResponse = await response.json();
      setAccessToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("refreshToken", data.refresh_token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data: AuthResponse = await response.json();
      setAccessToken(data.access_token);
      setUser(data.user);
      localStorage.setItem("refreshToken", data.refresh_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessTokenState(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
