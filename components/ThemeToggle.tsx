"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "pronos-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getCurrentTheme(): Theme {
  const currentTheme = document.documentElement.dataset.theme;

  if (currentTheme === "light" || currentTheme === "dark") {
    return currentTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentTheme = getCurrentTheme();
    setTheme(currentTheme);
    applyTheme(currentTheme);
    setMounted(true);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Passer en mode ${nextTheme === "dark" ? "sombre" : "clair"}`}
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      onClick={() => {
        const updatedTheme = nextTheme;
        setTheme(updatedTheme);
        applyTheme(updatedTheme);
      }}
      type="button"
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" data-theme={mounted ? theme : "light"} />
      </span>
      <span className="theme-toggle-label">
        {mounted ? (theme === "dark" ? "Sombre" : "Clair") : "Thème"}
      </span>
    </button>
  );
}
