import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "ohm_theme_mode";

function getInitial(): ThemeMode {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getInitial);

  useEffect(() => {
    localStorage.setItem(KEY, mode);
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }, [mode]);

  const label = useMemo(() => {
    if (mode === "system") return "System";
    if (mode === "dark") return "Dark";
    return "Light";
  }, [mode]);

  function cycle() {
    setMode((m) => (m === "system" ? "dark" : m === "dark" ? "light" : "system"));
  }

  return { mode, setMode, cycle, label };
}
