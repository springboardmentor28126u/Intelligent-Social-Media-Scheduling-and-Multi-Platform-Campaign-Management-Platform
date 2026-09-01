import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setAuthToken, removeAuthToken, getAuthToken } from "../services/api";

export type RoleType = "administrator" | "business_user" | "marketing_team" | "content_creator";

export interface UserProfile {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: RoleType;
  avatar_url?: string;
  job_title?: string;
  company?: string;
  bio?: string;
  permissions: string[];
}

interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "info" | "warning";
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roleChangeNotice: string | null;
  setRoleChangeNotice: (notice: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  triggerRoleChangeLogout: (newRoleName?: string) => void;
  hasPermission: (permission: string) => boolean;
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: "success" | "error" | "info" | "warning") => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("socialpilot_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    title: string,
    message?: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch current user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const profile = await api.auth.getMe();
          setUser(profile);
          localStorage.setItem("socialpilot_user", JSON.stringify(profile));
        } catch {
          removeAuthToken();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for global logout events
    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener("auth_logout", handleLogoutEvent);
    return () => window.removeEventListener("auth_logout", handleLogoutEvent);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("socialpilot_user", JSON.stringify(res.user));
    setRoleChangeNotice(null);
    showToast("Signed In", `Welcome back, ${res.user.name}!`, "success");
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    setAuthToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("socialpilot_user", JSON.stringify(res.user));
    setRoleChangeNotice(null);
    showToast("Account Created", "Your workspace is ready!", "success");
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setToken(null);
    showToast("Signed Out", "You have been logged out.", "info");
    window.location.href = "/login";
  };

  const triggerRoleChangeLogout = (newRoleName?: string) => {
    removeAuthToken();
    setUser(null);
    setToken(null);
    const notice = newRoleName
      ? `Role updated to ${newRoleName.replace("_", " ").toUpperCase()}. Please sign in again to continue.`
      : "Role updated. Please sign in again to continue.";
    setRoleChangeNotice(notice);
    showToast("Session Expired", notice, "warning");
    window.location.href = "/login";
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "administrator") return true;
    if (user.permissions.includes("*")) return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        roleChangeNotice,
        setRoleChangeNotice,
        login,
        register,
        logout,
        triggerRoleChangeLogout,
        hasPermission,
        toasts,
        showToast,
        removeToast,
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
