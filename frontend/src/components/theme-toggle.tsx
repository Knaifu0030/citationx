"use client";

import { Button } from "@/components/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      onClick={toggle}
      aria-label={`Switch to ${nextTheme} mode`}
      className="gap-2"
    >
      <span
        className="h-2.5 w-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
        aria-hidden
      />
      <span className="text-sm font-medium">
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </span>
    </Button>
  );
}
