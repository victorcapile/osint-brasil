import Link from "next/link";
import type { Article, Stats } from "@/lib/types";
import {
  CONTINENT_META,
  GENRE_META,
  RADAR_THRESHOLD,
  TAG_LABELS,
} from "@/lib/types";
import { formatArticleDate, formatRelevance } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";
import ViewHeader from "./ViewHeader";

interface RadarViewProps {
  radar: Article[];
  stats: Stats | null;
  loading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (article: Article) => void;
}

function RadarLead({
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
    <article className="mt-6 border-t-2 border-accent bg-ink px-6 py-8 text-paper sm:px-10">
      <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em]">
        <span className="text-accent-light">{genre.label}</span>
        <span className="text-paper/40">
          Relevância {formatRelevance(article.relevance)}
        </span>
      </div>

      <h2 className="mt-4 max-w-4xl font-serif text-[30px] leading-[1.12] tracking-tight text-paper decoration-accent-light underline-offset-4 sm:text-[38px]">
        <Link
          href={`/noticia/${article.id}`}
          prefetch={false}
          className="hover:underline"
        >
          {article.title}
        </Link>
      </h2>

      {article.description ? (
        <p className="mt-4 line-clamp-3 max-w-2xl text-[13.5px] leading-relaxed text-paper/55">
          {article.description}
        </p>
      ) : null}

      {tags.length > 0 ? (
        <p className="mt-5 text-[9px] uppercase tracking-[0.16em] text-paper/40">
          {tags.slice(0, 5).join(" · ")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.14em] text-paper/40">
        <span className="min-w-0 truncate">{article.sourceName}</span>
        <div className="flex items-center gap-4">
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
      <div className="h-2 w-24 animate-pulse bg-white/10" />
      <div className="mt-6 h-9 w-3/4 animate-pulse bg-white/10" />
      <div className="mt-3 h-9 w-1/2 animate-pulse bg-white/10" />
      <div className="mt-6 h-3 w-2/3 animate-pulse bg-white/5" />
    </div>
  );
}

export default function RadarView({
  radar,
  stats,
  loading,
  favoriteIds,
  onToggleFavorite,
}: RadarViewProps) {
  const lead = radar[0] ?? null;
  const rest = radar.slice(1);

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
        <span className="ml-auto shrink-0">
          relevância ≥ {formatRelevance(RADAR_THRESHOLD)} ·{" "}
          {stats?.radar ?? radar.length} notícias
        </span>
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
        <>
          <RadarLead
            article={lead}
            isFavorite={favoriteIds.has(lead.id)}
            onToggleFavorite={() => onToggleFavorite(lead)}
          />
          <div className="grid gap-x-10 md:grid-cols-2">
            {rest.map((article) => (
              <RadarStory
                key={article.id}
                article={article}
                isFavorite={favoriteIds.has(article.id)}
                onToggleFavorite={() => onToggleFavorite(article)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
