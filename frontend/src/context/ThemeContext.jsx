import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "socialpilot-theme";

function isWorkspaceRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  const pathname = window.location.pathname;

  return (
    pathname === "/dashboard" ||
    pathname === "/analytics" ||
    pathname === "/campaigns" ||
    pathname.startsWith("/campaigns/") ||
    pathname === "/posts" ||
    pathname === "/create-post" ||
    pathname === "/calendar" ||
    pathname === "/drafts" ||
    pathname === "/publishing-logs" ||
    pathname === "/publishing-queue" ||
    pathname === "/social-accounts" ||
    pathname === "/reports" ||
    pathname === "/notifications" ||
    pathname === "/settings" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return isWorkspaceRoute() ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent("socialpilot-theme-change", { detail: theme }));
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        setTheme(mediaQuery.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
