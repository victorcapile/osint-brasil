"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  tone?: "light" | "dark";
  compact?: boolean;
}

export default function FavoriteButton({
  active,
  onToggle,
  tone = "light",
  compact = false,
}: FavoriteButtonProps) {
  const Icon = active ? BookmarkCheck : Bookmark;
  const color =
    tone === "dark"
      ? active
        ? "text-accent-light"
        : "text-paper/40 hover:text-paper"
      : active
        ? "text-accent"
        : "text-faint hover:text-ink";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? "Remover dos favoritos" : "Salvar para ler depois"}
      title={active ? "Remover dos favoritos" : "Salvar para ler depois"}
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] transition ${color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? null : <span>{active ? "Salvo" : "Salvar"}</span>}
    </button>
  );
}
