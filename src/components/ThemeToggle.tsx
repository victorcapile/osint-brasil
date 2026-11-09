"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      title="Alternar tema claro e escuro"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-faint transition hover:bg-paper-raised hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
