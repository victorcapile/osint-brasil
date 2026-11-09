import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/lib/types";
import {
  CONTINENT_META,
  GENRE_META,
  RADAR_THRESHOLD,
  TAG_LABELS,
} from "@/lib/types";
import {
  formatArticleDate,
  formatClock,
  formatDateTime,
  formatRelevance,
} from "@/lib/format";
import FavoriteButton from "./FavoriteButton";

function sourceInitials(article: Article): string {
  if (article.sourceId.startsWith("gn-")) return "GN";
  return article.sourceId.slice(0, 2).toUpperCase();
}

interface SocialPostProps {
  article: Article;
  isLast: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function SocialPost({
  article,
  isLast,
  isFavorite,
  onToggleFavorite,
}: SocialPostProps) {
  const isRadar = article.relevance >= RADAR_THRESHOLD;
  const tags = article.tags
    .map((tag) => TAG_LABELS[tag])
    .filter((tag): tag is string => Boolean(tag));

  return (
    <article className="flex gap-4 border-b border-line py-5">
      <div className="flex flex-col items-center">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-paper-raised font-serif text-[11px] uppercase tracking-wide text-ink">
          {sourceInitials(article)}
        </div>
        {!isLast ? (
          <span className="mt-2 w-px flex-1 bg-line" aria-hidden />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[12px] font-medium text-ink">
            {article.sourceName}
          </span>
          <span className="text-[11px] text-faint">@{article.sourceId}</span>
          <span className="text-line-strong">·</span>
          <span
            className="text-[10px] uppercase tracking-[0.12em] text-faint"
            title={`Publicado em ${formatDateTime(article.publishedAt)}`}
          >
            {formatArticleDate(article.publishedAt)} ·{" "}
            {formatClock(article.publishedAt)}
          </span>
          {isRadar ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-accent">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
              Radar {formatRelevance(article.relevance)}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-faint">
          <span>{GENRE_META[article.genre].label}</span>
          <span className="text-line-strong">·</span>
          <span>{CONTINENT_META[article.continent].label}</span>
        </div>

        <h2 className="mt-2 font-serif text-[20px] leading-snug text-ink decoration-line-strong underline-offset-4">
          <Link
            href={`/noticia/${article.id}`}
            prefetch={false}
            className="hover:underline"
          >
            {article.title}
          </Link>
        </h2>

        {article.description ? (
          <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-muted">
            {article.description}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-faint">
            {tags.slice(0, 4).join(" · ")}
          </p>
        ) : null}

        {article.favoritedAt ? (
          <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-accent">
            Salvo em {formatArticleDate(article.favoritedAt)}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-faint">
          <Link
            href={`/noticia/${article.id}`}
            prefetch={false}
            className="inline-flex items-center gap-1 text-ink transition hover:text-accent"
          >
            Ler notícia
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <FavoriteButton
            active={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>
      </div>
    </article>
  );
}
