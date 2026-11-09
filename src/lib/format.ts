const RELEVANCE_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/** Relevância na escala 0–10, com uma casa decimal (ex.: 7,4). */
export function formatRelevance(value: number): string {
  return RELEVANCE_FORMAT.format(value);
}

/** Data editorial curta: "09 nov 2026". */
export function formatArticleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toLowerCase();

  return `${day} ${month} ${date.getFullYear()}`;
}

export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) return "—";
  if (diff < 0) return "agora";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
