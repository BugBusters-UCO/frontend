"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-surface-dim animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2 rounded-full hover:bg-surface-dim transition-colors group flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label="Toggle theme"
    >
      <span
        className={`material-symbols-outlined transition-transform duration-500 ${
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0 hidden"
        }`}
      >
        dark_mode
      </span>
      <span
        className={`material-symbols-outlined transition-transform duration-500 ${
          !isDark ? "rotate-0 scale-100 text-amber-500" : "rotate-90 scale-0 hidden"
        }`}
      >
        light_mode
      </span>
      <div className="absolute inset-0 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 bg-surface-dim -z-10" />
    </button>
  );
}
