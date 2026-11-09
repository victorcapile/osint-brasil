"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Article, ArticlesResponse } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import SocialPost from "./SocialPost";
import ViewHeader from "./ViewHeader";

interface FeedViewProps {
  articles: Article[];
  data: ArticlesResponse | null;
  loading: boolean;
  toolbar: ReactNode;
  favorites: Article[];
  favoritesLoading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (article: Article) => void;
}

function FeedSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-4 border-b border-line py-5">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-line/60" />
          <div className="flex-1 space-y-3">
            <div className="h-2 w-40 animate-pulse bg-line/60" />
            <div className="h-4 w-5/6 animate-pulse bg-line/50" />
            <div className="h-3 w-full animate-pulse bg-line/40" />
            <div className="h-3 w-3/4 animate-pulse bg-line/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedView({
  articles,
  data,
  loading,
  toolbar,
  favorites,
  favoritesLoading,
  favoriteIds,
  onToggleFavorite,
}: FeedViewProps) {
  const [mode, setMode] = useState<"fluxo" | "favoritos">("fluxo");

  return (
    <section className="mx-auto w-full max-w-[960px]">
      <ViewHeader
        eyebrow="Fluxo contínuo"
        title="Feed"
        description="As notícias em ordem de chegada, com fonte, data e eixos de interesse. Salve o que quiser ler depois."
      />

      <div className="flex items-center gap-7 border-b border-line py-3">
        <button
          type="button"
          onClick={() => setMode("fluxo")}
          className={`-mb-px border-b-2 py-1 text-[10px] uppercase tracking-[0.16em] transition ${
            mode === "fluxo"
              ? "border-accent text-ink"
              : "border-transparent text-faint hover:text-ink"
          }`}
        >
          Fluxo
          <span className="ml-2 tabular-nums text-faint">
            {data ? formatNumber(data.total) : "…"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("favoritos")}
          className={`-mb-px border-b-2 py-1 text-[10px] uppercase tracking-[0.16em] transition ${
            mode === "favoritos"
              ? "border-accent text-ink"
              : "border-transparent text-faint hover:text-ink"
          }`}
        >
          Favoritos
          <span className="ml-2 tabular-nums text-faint">
            {favoritesLoading ? "…" : favorites.length}
          </span>
        </button>
      </div>

      {mode === "fluxo" ? (
        <>
          {toolbar}

          {loading && !data ? (
            <FeedSkeleton />
          ) : articles.length === 0 ? (
            <div className="border-b border-line py-20 text-center">
              <p className="font-serif text-2xl text-ink">Nenhuma notícia encontrada</p>
              <p className="mt-2 text-sm text-muted">
                Ajuste os filtros ou atualize a coleta.
              </p>
            </div>
          ) : (
            <div
              className={
                loading && data
                  ? "opacity-50 transition-opacity"
                  : "opacity-100 transition-opacity"
              }
            >
              {articles.map((article, index) => (
                <SocialPost
                  key={article.id}
                  article={article}
                  isLast={index === articles.length - 1}
                  isFavorite={favoriteIds.has(article.id)}
                  onToggleFavorite={() => onToggleFavorite(article)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="py-3 text-[10px] uppercase tracking-[0.16em] text-faint">
            Salvas para ler depois · removidas após 30 dias
          </p>

          {favoritesLoading ? (
            <FeedSkeleton />
          ) : favorites.length === 0 ? (
            <div className="border-b border-line py-20 text-center">
              <p className="font-serif text-2xl text-ink">Nada salvo ainda</p>
              <p className="mt-2 text-sm text-muted">
                Use o botão “Salvar” nos cards para montar sua lista de leitura.
              </p>
              <button
                type="button"
                onClick={() => setMode("fluxo")}
                className="mt-4 text-[10px] uppercase tracking-[0.16em] text-accent underline underline-offset-4"
              >
                Ir para o fluxo
              </button>
            </div>
          ) : (
            <div>
              {favorites.map((article, index) => (
                <SocialPost
                  key={article.id}
                  article={article}
                  isLast={index === favorites.length - 1}
                  isFavorite={favoriteIds.has(article.id)}
                  onToggleFavorite={() => onToggleFavorite(article)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
