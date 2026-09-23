import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthState } from "../types";
import { loginUser } from "../services/api";
import { SafeStorage } from "../utils/storage";

export const USER_STORAGE_KEY = "market99_user";
export const TOKEN_STORAGE_KEY = "market99_token";
export const CREDENTIALS_STORAGE_KEY = "market99_saved_credentials";

interface AuthContextType extends AuthState {
  login: (
    email: string,
    pass: string,
    rememberMe?: boolean,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUserDirectly: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const savedUserStr = await SafeStorage.getItem(USER_STORAGE_KEY);
      const savedToken = await SafeStorage.getItem(TOKEN_STORAGE_KEY);

      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        setUser({
          id: parsed.id || parsed.userId || "1",
          name: parsed.username || parsed.name || "User",
          username: parsed.username || "",
          email: parsed.email || "",
          role: parsed.role || "Warehouse Operator",
          facility: parsed.facility || parsed.organization_name || "WH-01",
          userGroup:
            parsed.userGroup || parsed.user_group || parsed.group || "B",
          userContact: parsed.userContact,
          token: savedToken || undefined,
        });
      }
    } catch (err) {
      console.log("SESSION RESTORE ERROR:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const login = async (
    email: string,
    pass: string,
    rememberMe = true,
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const trimmedEmail = email ? email.trim() : "";
    const trimmedPass = pass ? pass.trim() : "";

    if (!trimmedEmail || !trimmedPass) {
      setError("Please enter your credentials.");
      setIsLoading(false);
      return false;
    }

    try {
      const data = await loginUser(trimmedEmail, trimmedPass);

      if (data && data.status === true) {
        const u = data.user || {};
        const loggedUser: User = {
          id: u.id || "1",
          name: u.username || u.name || trimmedEmail.split("@")[0] || "User",
          username: u.username || "",
          email: u.email || trimmedEmail,
          role: u.role || "Warehouse Operator",
          facility: u.facility || "WH-01",
          userGroup:
            u.userGroup || u.user_group || u.group || u.UserGroup || "",
          userContact: u.userContact,
          token: data.token ? String(data.token) : undefined,
        };

        setUser(loggedUser);

        // Save session safely
        await SafeStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
        if (data.token) {
          await SafeStorage.setItem(TOKEN_STORAGE_KEY, String(data.token));
        }

        if (rememberMe) {
          await SafeStorage.setItem(
            CREDENTIALS_STORAGE_KEY,
            JSON.stringify({ email: trimmedEmail, password: trimmedPass }),
          );
        } else {
          await SafeStorage.removeItem(CREDENTIALS_STORAGE_KEY);
        }

        setIsLoading(false);
        return true;
      } else {
        const errorMsg = data?.message || "Invalid username or password.";
        setError(errorMsg);
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      setError(err?.message || "Unable to connect to server.");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await SafeStorage.removeItem(USER_STORAGE_KEY);
      await SafeStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (err) {
      console.log("LOGOUT ERROR:", err);
    } finally {
      setUser(null);
    }
  };

  const setUserDirectly = (newUser: User | null) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        clearError,
        setUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
