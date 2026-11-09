"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COUNTRY_BY_CODE } from "@/lib/country-data";
import { GENRE_META } from "@/lib/types";
import type { Article, Stats } from "@/lib/types";
import { formatArticleDate, formatDateTime } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";

interface CountryPanelProps {
  selected: string | null;
  stats: Stats | null;
  articles: Article[];
  total: number;
  loading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (article: Article) => void;
  onSelect: (code: string | null) => void;
  onOpenFeed?: () => void;
}

export default function CountryPanel({
  selected,
  stats,
  articles,
  total,
  loading,
  favoriteIds,
  onToggleFavorite,
  onSelect,
  onOpenFeed,
}: CountryPanelProps) {
  const selectedName = selected
    ? COUNTRY_BY_CODE.get(selected)?.name ?? selected
    : null;
  const selectedTotal =
    selected && stats ? stats.byCountry[selected] ?? total : total;

  if (selected) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-faint">
          País selecionado
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-[28px] leading-tight text-ink">
            {selectedName}
          </h3>
          <span className="shrink-0 text-[12px] tabular-nums text-muted">
            {selectedTotal} {selectedTotal === 1 ? "notícia" : "notícias"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mt-2 text-[10px] uppercase tracking-[0.16em] text-accent underline underline-offset-4"
        >
          Limpar seleção
        </button>

        <p className="mt-6 border-b border-line pb-2 text-[10px] uppercase tracking-[0.18em] text-faint">
          Últimas notícias
        </p>

        {loading && articles.length === 0 ? (
          <div className="space-y-4 py-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-2">
                <div className="h-2 w-16 animate-pulse bg-line/70" />
                <div className="h-4 w-full animate-pulse bg-line/50" />
                <div className="h-4 w-4/5 animate-pulse bg-line/40" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="py-4 text-sm text-muted">Sem notícias para este país.</p>
        ) : (
          <div>
            {articles.slice(0, 5).map((article) => (
              <div key={article.id} className="border-b border-line py-4">
                <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.16em] text-faint">
                  <span>{GENRE_META[article.genre].label}</span>
                  <span title={`Publicado em ${formatDateTime(article.publishedAt)}`}>
                    {formatArticleDate(article.publishedAt)}
                  </span>
                </div>

                <Link
                  href={`/noticia/${article.id}`}
                  prefetch={false}
                  className="group mt-1 block"
                >
                  <p className="font-serif text-[18px] leading-snug text-ink decoration-line-strong underline-offset-4 group-hover:underline">
                    {article.title}
                  </p>
                  <p className="mt-1 text-[12px] text-faint">{article.sourceName}</p>
                </Link>

                <div className="mt-2">
                  <FavoriteButton
                    active={favoriteIds.has(article.id)}
                    onToggle={() => onToggleFavorite(article)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          O filtro também está ativo no Feed.
        </p>
        {onOpenFeed ? (
          <button
            type="button"
            onClick={onOpenFeed}
            className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-ink transition hover:text-accent"
          >
            Ver todas no feed
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    );
  }

  const ranking = stats
    ? Object.entries(stats.byCountry ?? {})
        .filter(([code]) => COUNTRY_BY_CODE.has(code))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
    : [];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-faint">
        Países em destaque
      </p>
      <p className="mt-1 font-serif text-[24px] leading-tight text-ink">
        Escolha um país no mapa
      </p>

      <div className="mt-4 border-t border-line">
        {ranking.length === 0 ? (
          <p className="py-3 text-sm text-muted">Carregando ranking…</p>
        ) : (
          ranking.map(([code, count]) => {
            const name = COUNTRY_BY_CODE.get(code)?.name ?? code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className="flex w-full items-baseline justify-between gap-3 border-b border-line py-2.5 text-left transition hover:text-accent"
              >
                <span className="font-serif text-[18px] leading-tight">{name}</span>
                <span className="text-[11px] tabular-nums text-faint">{count}</span>
              </button>
            );
          })
        )}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        Clique em um país para filtrar o fluxo e ver as notícias daquele lugar.
      </p>
    </div>
  );
}
