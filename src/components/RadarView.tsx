"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Article } from "@/lib/types";
import { CONTINENT_META, GENRE_META, TAG_LABELS } from "@/lib/types";
import { formatArticleDate, formatRelevance } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";
import ViewHeader from "./ViewHeader";

interface RadarViewProps {
  radar: Article[];
  loading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (article: Article) => void;
}

function RadarLead({
  article,
  index,
  total,
  isFavorite,
  onToggleFavorite,
  onPrev,
  onNext,
}: {
  article: Article;
  index: number;
  total: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const genre = GENRE_META[article.genre];
  const region = CONTINENT_META[article.continent];
  const tags = article.tags
    .map((tag) => TAG_LABELS[tag])
    .filter((tag): tag is string => Boolean(tag));

  return (
    <article className="border-t-2 border-accent bg-ink px-6 py-8 text-paper">
      <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em]">
        <span className="text-accent-light">{genre.label}</span>
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums text-paper/55">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Destaque anterior"
            className="inline-flex h-7 w-7 items-center justify-center border border-paper/30 text-paper/70 transition hover:border-paper/60 hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/60"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Próximo destaque"
            className="inline-flex h-7 w-7 items-center justify-center border border-paper/30 text-paper/70 transition hover:border-paper/60 hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/60"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h2 className="mt-4 font-serif text-[26px] leading-[1.13] tracking-tight text-paper decoration-accent-light underline-offset-4 sm:text-[30px]">
        <Link
          href={`/noticia/${article.id}`}
          prefetch={false}
          className="hover:underline"
        >
          {article.title}
        </Link>
      </h2>

      {article.description ? (
        <p className="mt-4 line-clamp-3 text-[13.5px] leading-relaxed text-paper/55">
          {article.description}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <p className="mt-5 text-[9px] uppercase tracking-[0.16em] text-paper/55">
          {tags.slice(0, 5).join(" · ")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-paper/10 pt-4 text-[10px] uppercase tracking-[0.14em] text-paper/55">
        <span className="min-w-0 truncate">{article.sourceName}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 tabular-nums text-accent-light">
            R {formatRelevance(article.relevance)}
          </span>
          <FavoriteButton
            active={isFavorite}
            onToggle={onToggleFavorite}
            tone="dark"
          />
          <span className="shrink-0">
            {region.short} · {formatArticleDate(article.publishedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function RadarStory({
  article,
  isFavorite,
  onToggleFavorite,
}: {
  article: Article;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const genre = GENRE_META[article.genre];
  const region = CONTINENT_META[article.continent];
  const tags = article.tags
    .map((tag) => TAG_LABELS[tag])
    .filter((tag): tag is string => Boolean(tag));

  return (
    <article className="group border-t border-line py-5">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em]">
        <span className="text-muted">{genre.label}</span>
        <span className="tabular-nums text-accent">
          R {formatRelevance(article.relevance)}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[19px] leading-snug text-ink decoration-line-strong underline-offset-4">
        <Link
          href={`/noticia/${article.id}`}
          prefetch={false}
          className="hover:underline"
        >
          {article.title}
        </Link>
      </h3>

      {article.description ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
          {article.description}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-faint">
          {tags.slice(0, 4).join(" · ")}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-faint">
        <span className="min-w-0 truncate">{article.sourceName}</span>
        <div className="flex shrink-0 items-center gap-3">
          <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
          <span>{region.short} · {formatArticleDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function RadarSkeleton() {
  return (
    <div className="mt-6 border-t-2 border-accent bg-ink px-6 py-8 sm:px-10">
      <div className="h-2 w-24 animate-pulse bg-paper/10" />
      <div className="mt-6 h-9 w-3/4 animate-pulse bg-paper/10" />
      <div className="mt-3 h-9 w-1/2 animate-pulse bg-paper/10" />
      <div className="mt-6 h-3 w-2/3 animate-pulse bg-paper/5" />
    </div>
  );
}

export default function RadarView({
  radar,
  loading,
  favoriteIds,
  onToggleFavorite,
}: RadarViewProps) {
  const [leadIndex, setLeadIndex] = useState(0);
  const featured = radar.slice(0, 3);
  const lead =
    featured.length > 0 ? featured[leadIndex % featured.length] : null;
  const rest = radar.slice(featured.length);

  const tagCounts = new Map<string, number>();
  for (const article of radar) {
    for (const tag of article.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl">
      <ViewHeader
        eyebrow="Inteligência estratégica"
        title="Radar Brasil"
        description="Notícias com maior valor para a inteligência de Estado, ordenadas por relevância estratégica."
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line py-4 text-[10px] uppercase tracking-[0.14em] text-faint">
        {topTags.map(([tag, count]) => (
          <span key={tag}>
            <span className="text-ink">{TAG_LABELS[tag] ?? tag}</span>
            <span className="ml-1.5 tabular-nums">{count}</span>
          </span>
        ))}
      </div>

      {loading && radar.length === 0 ? (
        <RadarSkeleton />
      ) : !lead ? (
        <div className="py-20 text-center">
          <p className="font-serif text-2xl text-ink">Nenhuma notícia no radar</p>
          <p className="mt-2 text-sm text-muted">
            Ajuste os critérios ou atualize a coleta.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-x-10 gap-y-2 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-1">
            <RadarLead
              article={lead}
              index={leadIndex % featured.length}
              total={featured.length}
              isFavorite={favoriteIds.has(lead.id)}
              onToggleFavorite={() => onToggleFavorite(lead)}
              onPrev={() =>
                setLeadIndex(
                  (current) =>
                    (current - 1 + featured.length) % featured.length,
                )
              }
              onNext={() =>
                setLeadIndex((current) => (current + 1) % featured.length)
              }
            />
          </div>
          <div className="grid min-w-0 gap-x-10 md:grid-cols-2 lg:col-span-2">
            {rest.map((article) => (
              <RadarStory
                key={article.id}
                article={article}
                isFavorite={favoriteIds.has(article.id)}
                onToggleFavorite={() => onToggleFavorite(article)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
