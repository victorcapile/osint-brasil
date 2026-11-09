"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, RefreshCw, Search, X } from "lucide-react";
import type {
  Article,
  ArticlesResponse,
  Continent,
  FavoritesResponse,
  Genre,
  RefreshResult,
  Scope,
  Stats,
} from "@/lib/types";
import {
  ARTICLE_RETENTION_DAYS,
  CONTINENT_META,
  CONTINENT_ORDER,
  GENRE_META,
  GENRE_ORDER,
  RADAR_THRESHOLD,
} from "@/lib/types";
import { COUNTRY_BY_CODE } from "@/lib/country-data";
import { SOURCES, SOURCE_BY_ID } from "@/lib/sources";
import { formatClock, formatNumber, formatRelevance } from "@/lib/format";
import FeedView from "./FeedView";
import MapView from "./MapView";
import RadarView from "./RadarView";

type View = "mapa" | "radar" | "feed";
type ScopeFilter = "todos" | Scope;
type GenreFilter = "todos" | Genre;
type ContinentFilter = "todos" | Continent;

const VIEWS: { id: View; label: string }[] = [
  { id: "mapa", label: "Mapa" },
  { id: "radar", label: "Radar" },
  { id: "feed", label: "Feed" },
];

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

let seedPromise: Promise<Response> | null = null;

function seedDatabase(): Promise<Response> {
  if (!seedPromise) {
    seedPromise = fetch("/api/refresh", { method: "POST" });
  }
  return seedPromise;
}

async function getArticles(url: string, signal: AbortSignal): Promise<ArticlesResponse> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Não foi possível carregar as notícias (HTTP ${response.status}).`);
  }
  return (await response.json()) as ArticlesResponse;
}

async function fetchFavorites(): Promise<FavoritesResponse> {
  const response = await fetch("/api/favorites", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Não foi possível carregar os favoritos.");
  }
  return (await response.json()) as FavoritesResponse;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none border-0 bg-transparent py-1.5 pl-0 pr-6 text-[12px] font-medium tracking-wide text-ink-soft focus:outline-none focus:ring-0 sm:w-auto"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
        aria-hidden
      />
    </div>
  );
}

function LedgerStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-2 first:pl-0 last:pr-0 sm:px-6">
      <p className="truncate text-[9px] uppercase tracking-[0.12em] text-faint sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[18px] leading-none tabular-nums text-ink sm:mt-1.5 sm:text-[30px]">
        {value}
      </p>
      <p className="mt-1 hidden text-[11px] text-muted sm:block">{hint}</p>
    </div>
  );
}

function Notice({
  children,
  tone = "neutral",
  onDismiss,
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`mt-6 flex items-start justify-between gap-4 border-l-2 px-4 py-3 text-[13px] leading-relaxed ${
        tone === "error"
          ? "border-accent bg-paper-raised text-accent"
          : "border-ink bg-paper-raised text-ink-soft"
      }`}
    >
      <p>{children}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="mt-0.5 text-faint transition hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState<View>("radar");
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInfo, setRefreshInfo] = useState<RefreshResult | null>(null);
  const [tick, setTick] = useState(0);
  const [today, setToday] = useState("");
  const [favorites, setFavorites] = useState<Article[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("todos");
  const [genre, setGenre] = useState<GenreFilter>("todos");
  const [continent, setContinent] = useState<ContinentFilter>("todos");
  const [country, setCountry] = useState<string | null>(null);
  const [source, setSource] = useState("todos");
  const [sort, setSort] = useState<"recentes" | "relevancia">("recentes");

  useEffect(() => {
    setToday(DATE_FORMAT.format(new Date()));
    void loadFavorites();
  }, []);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "mapa" || hash === "radar" || hash === "feed") {
        setView(hash);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (scope !== "todos") params.set("scope", scope);
    if (genre !== "todos") params.set("genre", genre);
    if (continent !== "todos") params.set("continent", continent);
    if (country) params.set("country", country);
    if (source !== "todos") params.set("source", source);
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    params.set("sort", sort);
    params.set("limit", "150");
    return `/api/articles?${params.toString()}`;
  }, [scope, genre, continent, country, source, debouncedQ, sort]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        let payload = await getArticles(url, controller.signal);

        if (payload.stats.total === 0) {
          if (active) setBootstrapping(true);
          const response = await seedDatabase();
          if (!response.ok) {
            seedPromise = null;
            throw new Error("A coleta inicial falhou. Tente atualizar novamente.");
          }
          if (active && !controller.signal.aborted) {
            payload = await getArticles(url, controller.signal);
          }
        }

        if (active && !controller.signal.aborted) setData(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (active) {
          setError(err instanceof Error ? err.message : "Erro inesperado ao carregar.");
        }
      } finally {
        if (active) {
          setBootstrapping(false);
          if (!controller.signal.aborted) setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, tick]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = (await response.json()) as RefreshResult & { error?: string };
      if (!response.ok || result.ok === false) {
        throw new Error(result.error ?? "Não foi possível atualizar as notícias.");
      }
      setRefreshInfo(result);
      setTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar as notícias.");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadFavorites() {
    try {
      const payload = await fetchFavorites();
      setFavorites(payload.favorites);
      setFavoriteIds(new Set(payload.favorites.map((item) => item.id)));
    } catch {
      // mantém o estado atual
    } finally {
      setFavoritesLoading(false);
    }
  }

  async function toggleFavorite(article: Article) {
    const isFavorite = favoriteIds.has(article.id);

    setFavoriteIds((previous) => {
      const next = new Set(previous);
      if (isFavorite) next.delete(article.id);
      else next.add(article.id);
      return next;
    });

    setFavorites((previous) => {
      if (isFavorite) return previous.filter((item) => item.id !== article.id);
      return [
        { ...article, favoritedAt: new Date().toISOString() },
        ...previous,
      ];
    });

    try {
      if (isFavorite) {
        await fetch(`/api/favorites?id=${encodeURIComponent(article.id)}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ articleId: article.id }),
        });
      }
      await loadFavorites();
    } catch {
      await loadFavorites();
    }
  }

  function changeView(next: View) {
    setView(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo(0, 0);
  }

  function handleCountrySelect(code: string | null) {
    setCountry(code);
    setScope("todos");
    setContinent("todos");
  }

  function handleRegionChange(value: string) {
    if (value.startsWith("pais:")) return;
    setCountry(null);
    if (value === "todas") {
      setScope("todos");
      setContinent("todos");
      return;
    }
    if (value === "escopo:nacional") {
      setScope("nacional");
      setContinent("todos");
      return;
    }
    if (value === "escopo:internacional") {
      setScope("internacional");
      setContinent("todos");
      return;
    }
    if (value.startsWith("continente:")) {
      setScope("todos");
      setContinent(value.slice("continente:".length) as ContinentFilter);
    }
  }

  function clearFilters() {
    setScope("todos");
    setGenre("todos");
    setContinent("todos");
    setCountry(null);
    setSource("todos");
    setQ("");
    setDebouncedQ("");
    setSort("recentes");
  }

  const stats = data?.stats;
  const articles = data?.articles ?? [];
  const radar = data?.radar ?? [];
  const totalMatches = data?.total ?? articles.length;

  const activeFilters = [
    scope !== "todos",
    genre !== "todos",
    continent !== "todos",
    country !== null,
    source !== "todos",
    q.trim().length > 0,
  ].filter(Boolean).length;

  const regionValue = country
    ? `pais:${country}`
    : scope === "nacional"
      ? "escopo:nacional"
      : continent !== "todos"
        ? `continente:${continent}`
        : scope === "internacional"
          ? "escopo:internacional"
          : "todas";

  function countFor(id: View): number | null {
    if (!stats) return null;
    if (id === "mapa") return Object.keys(stats.byCountry ?? {}).length;
    if (id === "radar") return stats.radar;
    return stats.total;
  }

  const feedToolbar = (
    <div className="space-y-2 border-b border-line py-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por tema, palavra-chave ou fonte"
            aria-label="Buscar notícias"
            className="w-full border-0 bg-transparent py-2 pl-6 pr-6 text-[13px] text-ink placeholder:text-faint focus:outline-none focus:ring-0"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-faint transition hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
          <FilterSelect label="Região" value={regionValue} onChange={handleRegionChange}>
            {country ? (
              <option value={`pais:${country}`}>
                {COUNTRY_BY_CODE.get(country)?.name ?? country}
              </option>
            ) : null}
            <option value="todas">Todas as regiões</option>
            <option value="escopo:nacional">Brasil (nacional)</option>
            <option value="escopo:internacional">Internacional (todos)</option>
            <optgroup label="Continentes">
              {CONTINENT_ORDER.filter((item) => item !== "brasil").map((item) => (
                <option key={item} value={`continente:${item}`}>
                  {CONTINENT_META[item].label}
                </option>
              ))}
            </optgroup>
          </FilterSelect>

          <FilterSelect
            label="Gênero"
            value={genre}
            onChange={(value) => setGenre(value as GenreFilter)}
          >
            <option value="todos">Todos os gêneros</option>
            {GENRE_ORDER.map((item) => (
              <option key={item} value={item}>
                {GENRE_META[item].label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Fonte" value={source} onChange={setSource}>
            <option value="todos">Todas as fontes</option>
            {SOURCES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {stats?.bySource?.[item.id]
                  ? ` (${stats.bySource[item.id]})`
                  : ""}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Ordenar"
            value={sort}
            onChange={(value) => setSort(value as "recentes" | "relevancia")}
          >
            <option value="recentes">Mais recentes</option>
            <option value="relevancia">Mais relevantes</option>
          </FilterSelect>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
          {data ? (
            <>
              {country
                ? COUNTRY_BY_CODE.get(country)?.name ?? country
                : source !== "todos"
                  ? SOURCE_BY_ID.get(source)?.name ?? source
                  : "Fluxo"}
              <span className="mx-2 text-line-strong">/</span>
              <span className="text-ink">
                {totalMatches > articles.length
                  ? `${formatNumber(articles.length)} de ${formatNumber(totalMatches)}`
                  : formatNumber(totalMatches)}
              </span>{" "}
              {totalMatches === 1 ? "notícia" : "notícias"}
            </>
          ) : (
            "Carregando notícias"
          )}
        </p>
        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-accent underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="h-[3px] bg-ink" />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
          <div className="flex items-baseline gap-3">
            <span className="whitespace-nowrap font-serif text-[22px] tracking-tight text-ink">
              Radar OSINT
            </span>
            <span className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-faint lg:inline">
              Inteligência de fontes abertas
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-faint xl:inline">
              {today}
            </span>
            <span className="hidden h-3 w-px bg-line xl:block" />
            <span className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-faint md:inline">
              Atualizado {formatClock(stats?.lastRefresh ?? null)}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Coletando" : "Atualizar"}
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-8">
          <nav className="flex items-end gap-8">
            {VIEWS.map((item) => {
              const active = view === item.id;
              const count = countFor(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeView(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-0.5 flex items-baseline gap-2 border-b-2 py-4 font-serif text-[20px] leading-none tracking-tight transition sm:text-[24px] ${
                    active
                      ? "border-accent text-ink"
                      : "border-transparent text-faint hover:text-ink"
                  }`}
                >
                  {item.label}
                  {count !== null ? (
                    <span
                      className={`hidden text-[10px] tabular-nums sm:inline ${
                        active ? "text-muted" : "text-faint"
                      }`}
                    >
                      {formatNumber(count)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-5 lg:px-8">
        {bootstrapping ? (
          <Notice>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Coletando os feeds pela primeira vez. Isso pode levar até 30 segundos.
            </span>
          </Notice>
        ) : null}

        {error ? (
          <Notice tone="error" onDismiss={() => setError(null)}>
            {error}
          </Notice>
        ) : null}

        {refreshInfo ? (
          <Notice onDismiss={() => setRefreshInfo(null)}>
            Coleta concluída: <strong className="font-medium">{refreshInfo.inserted}</strong>{" "}
            novas de <strong className="font-medium">{refreshInfo.collected}</strong> lidas em{" "}
            {(refreshInfo.durationMs / 1000).toFixed(1)}s.
            {refreshInfo.failedSources > 0
              ? ` ${refreshInfo.failedSources} fonte(s) falharam.`
              : " Todas as fontes responderam."}
          </Notice>
        ) : null}

        <section className="grid grid-cols-4 divide-x divide-line border-b border-line py-3 sm:py-5">
          <LedgerStat
            label="Notícias"
            value={stats ? formatNumber(stats.total) : "—"}
            hint={`últimos ${ARTICLE_RETENTION_DAYS} dias`}
          />
          <LedgerStat
            label="Nacional"
            value={stats ? formatNumber(stats.nacional) : "—"}
            hint={stats ? `${formatNumber(stats.internacional)} internacionais` : "carregando…"}
          />
          <LedgerStat
            label="No radar"
            value={stats ? formatNumber(stats.radar) : "—"}
            hint={`relevância ≥ ${formatRelevance(RADAR_THRESHOLD)}`}
          />
          <LedgerStat
            label="Fontes"
            value={stats ? formatNumber(stats.sources) : "—"}
            hint="feeds ativos"
          />
        </section>

        {view === "mapa" ? (
          <MapView
            stats={stats ?? null}
            articles={articles}
            total={totalMatches}
            loading={loading}
            country={country}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onCountrySelect={handleCountrySelect}
            onOpenFeed={() => changeView("feed")}
          />
        ) : view === "radar" ? (
          <RadarView
            radar={radar}
            loading={loading}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <FeedView
            articles={articles}
            data={data}
            loading={loading}
            toolbar={feedToolbar}
            favorites={favorites}
            favoritesLoading={favoritesLoading}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      <footer className="mt-16 border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-8 text-[11px] leading-relaxed text-faint sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>Radar OSINT · MVP local · Coleta via RSS · Classificação heurística</p>
          <p>
            Fontes abertas. Edite{" "}
            <code className="text-ink-soft">src/lib/sources.ts</code> para adicionar feeds.
          </p>
        </div>
      </footer>
    </div>
  );
}
