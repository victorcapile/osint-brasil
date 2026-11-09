import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { normalize } from "./text";
import {
  ARTICLE_RETENTION_DAYS,
  FAVORITES_RETENTION_DAYS,
  RADAR_THRESHOLD,
} from "./types";
import type {
  Article,
  Continent,
  Genre,
  Scope,
  Stats,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "news.db");

export interface NewArticle {
  id: string;
  title: string;
  titleNorm: string;
  searchText: string;
  description: string;
  link: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
  scope: Scope;
  country: string | null;
  continent: Continent;
  genre: Genre;
  relevance: number;
  tags: string[];
}

interface ArticleRow {
  id: string;
  title: string;
  description: string;
  link: string;
  source_id: string;
  source_name: string;
  published_at: string;
  fetched_at: string;
  scope: Scope;
  country: string | null;
  continent: Continent;
  genre: Genre;
  relevance: number;
  tags: string;
}

interface GlobalCache {
  __radarDb?: DatabaseSync;
}

const cache = globalThis as unknown as GlobalCache;

export function getDb(): DatabaseSync {
  if (cache.__radarDb) return cache.__radarDb;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);

  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      title_norm   TEXT NOT NULL,
      search_text  TEXT NOT NULL DEFAULT '',
      description  TEXT NOT NULL DEFAULT '',
      link         TEXT NOT NULL,
      source_id    TEXT NOT NULL,
      source_name  TEXT NOT NULL,
      published_at TEXT NOT NULL,
      fetched_at   TEXT NOT NULL,
      scope        TEXT NOT NULL,
      country      TEXT,
      continent    TEXT NOT NULL,
      genre        TEXT NOT NULL,
      relevance    REAL NOT NULL DEFAULT 0,
      tags         TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_genre ON articles(genre);
    CREATE INDEX IF NOT EXISTS idx_articles_continent ON articles(continent);
    CREATE INDEX IF NOT EXISTS idx_articles_relevance ON articles(relevance DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_title_norm ON articles(title_norm);
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      link         TEXT NOT NULL,
      source_id    TEXT NOT NULL,
      source_name  TEXT NOT NULL,
      published_at TEXT NOT NULL,
      favorited_at TEXT NOT NULL,
      scope        TEXT NOT NULL,
      country      TEXT,
      continent    TEXT NOT NULL,
      genre        TEXT NOT NULL,
      relevance    REAL NOT NULL DEFAULT 0,
      tags         TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_favorites_favorited ON favorites(favorited_at DESC);
    CREATE TABLE IF NOT EXISTS article_content (
      article_id TEXT PRIMARY KEY,
      html       TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL
    );
  `);

  // Migração leve para bancos criados antes da busca normalizada.
  const columns = db.prepare("PRAGMA table_info(articles)").all() as unknown as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "search_text")) {
    db.exec("ALTER TABLE articles ADD COLUMN search_text TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.some((column) => column.name === "country")) {
    db.exec("ALTER TABLE articles ADD COLUMN country TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country);");

  const missing = db
    .prepare(
      "SELECT id, title, description, source_name FROM articles WHERE search_text = '' LIMIT 5000",
    )
    .all() as unknown as {
    id: string;
    title: string;
    description: string;
    source_name: string;
  }[];
  if (missing.length > 0) {
    const backfill = db.prepare("UPDATE articles SET search_text = ? WHERE id = ?");
    db.exec("BEGIN");
    try {
      for (const row of missing) {
        backfill.run(
          normalize(`${row.title} ${row.description} ${row.source_name}`),
          row.id,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  cache.__radarDb = db;
  return db;
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function mapRow(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    link: row.link,
    sourceId: row.source_id,
    sourceName: row.source_name,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    scope: row.scope,
    country: row.country,
    continent: row.continent,
    genre: row.genre,
    relevance: Number(row.relevance),
    tags: parseTags(row.tags),
  };
}

interface FavoriteRow {
  id: string;
  title: string;
  description: string;
  link: string;
  source_id: string;
  source_name: string;
  published_at: string;
  favorited_at: string;
  scope: Scope;
  country: string | null;
  continent: Continent;
  genre: Genre;
  relevance: number;
  tags: string;
}

function mapFavoriteRow(row: FavoriteRow): Article {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    link: row.link,
    sourceId: row.source_id,
    sourceName: row.source_name,
    publishedAt: row.published_at,
    fetchedAt: row.favorited_at,
    scope: row.scope,
    country: row.country,
    continent: row.continent,
    genre: row.genre,
    relevance: Number(row.relevance),
    tags: parseTags(row.tags),
    favoritedAt: row.favorited_at,
  };
}

/** Insere artigos novos, ignorando links já existentes e títulos repetidos. */
export function insertArticles(rows: NewArticle[]): number {
  const db = getDb();
  const findId = db.prepare("SELECT 1 AS found FROM articles WHERE id = ? LIMIT 1");
  const findTitle = db.prepare("SELECT 1 AS found FROM articles WHERE title_norm = ? LIMIT 1");
  const insert = db.prepare(`
    INSERT INTO articles (
      id, title, title_norm, search_text, description, link, source_id, source_name,
      published_at, fetched_at, scope, country, continent, genre, relevance, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      search_text = excluded.search_text,
      description = excluded.description,
      relevance   = excluded.relevance,
      tags        = excluded.tags,
      fetched_at  = excluded.fetched_at,
      scope       = excluded.scope,
      country     = excluded.country,
      continent   = excluded.continent,
      genre       = excluded.genre
  `);
  const update = db.prepare(`
    UPDATE articles SET
      title       = ?,
      title_norm  = ?,
      search_text = ?,
      description = ?,
      source_name = ?,
      relevance   = ?,
      tags        = ?,
      fetched_at  = ?,
      scope       = ?,
      country     = ?,
      continent   = ?,
      genre       = ?
    WHERE id = ?
  `);

  let inserted = 0;
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      const tags = JSON.stringify(row.tags);

      // Mesmo artigo (mesmo link): atualiza resumo e classificação.
      const byId = findId.get(row.id) as { found?: number } | undefined;
      if (byId?.found) {
        update.run(
          row.title,
          row.titleNorm,
          row.searchText,
          row.description,
          row.sourceName,
          row.relevance,
          tags,
          row.fetchedAt,
          row.scope,
          row.country,
          row.continent,
          row.genre,
          row.id,
        );
        continue;
      }

      // Título repetido em outro veículo: evita duplicata.
      const byTitle = findTitle.get(row.titleNorm) as { found?: number } | undefined;
      if (byTitle?.found) continue;

      insert.run(
        row.id,
        row.title,
        row.titleNorm,
        row.searchText,
        row.description,
        row.link,
        row.sourceId,
        row.sourceName,
        row.publishedAt,
        row.fetchedAt,
        row.scope,
        row.country,
        row.continent,
        row.genre,
        row.relevance,
        tags,
      );
      inserted += 1;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return inserted;
}

export function pruneOld(days = 21): number {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM articles WHERE published_at < ?").run(cutoff);
  return Number(result.changes);
}

export interface QueryFilters {
  scope?: Scope;
  genre?: Genre;
  continent?: Continent;
  country?: string;
  q?: string;
  minRelevance?: number;
  sort?: "recentes" | "relevancia";
  limit?: number;
}

function buildWhere(filters: QueryFilters): {
  clause: string;
  params: (string | number)[];
} {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.scope) {
    where.push("scope = ?");
    params.push(filters.scope);
  }
  if (filters.genre) {
    where.push("genre = ?");
    params.push(filters.genre);
  }
  if (filters.continent) {
    where.push("continent = ?");
    params.push(filters.continent);
  }
  if (filters.country) {
    where.push("country = ?");
    params.push(filters.country);
  }
  if (filters.minRelevance && filters.minRelevance > 0) {
    where.push("relevance >= ?");
    params.push(filters.minRelevance);
  }
  if (filters.q && filters.q.trim().length > 0) {
    // Busca sem acentos e por palavras em qualquer ordem.
    const tokens = normalize(filters.q)
      .split(" ")
      .filter((token) => token.length > 1);
    for (const token of tokens) {
      where.push("search_text LIKE ?");
      params.push(`%${token}%`);
    }
  }

  return {
    clause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

export function queryArticles(filters: QueryFilters): Article[] {
  const db = getDb();
  const { clause, params } = buildWhere(filters);

  const order =
    filters.sort === "relevancia"
      ? "relevance DESC, published_at DESC"
      : "published_at DESC, relevance DESC";

  const limit = Math.max(1, Math.min(filters.limit ?? 120, 300));
  const sql = `
    SELECT * FROM articles
    ${clause}
    ORDER BY ${order}
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params, limit) as unknown as ArticleRow[];
  return rows.map(mapRow);
}

export function countArticlesFiltered(filters: QueryFilters): number {
  const db = getDb();
  const { clause, params } = buildWhere(filters);
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM articles ${clause}`)
    .get(...params) as { total: number } | undefined;
  return Number(row?.total ?? 0);
}

export function getRadar(limit = 6): Article[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM articles
       WHERE relevance >= ?
       ORDER BY relevance DESC, published_at DESC
       LIMIT ?`,
    )
    .all(RADAR_THRESHOLD, limit) as unknown as ArticleRow[];
  return rows.map(mapRow);
}

export function getStats(): Stats {
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN scope = 'nacional' THEN 1 ELSE 0 END), 0) AS nacional,
         COALESCE(SUM(CASE WHEN scope = 'internacional' THEN 1 ELSE 0 END), 0) AS internacional,
         COALESCE(SUM(CASE WHEN relevance >= ? THEN 1 ELSE 0 END), 0) AS radar,
         COUNT(DISTINCT source_id) AS sources
       FROM articles`,
    )
    .get(RADAR_THRESHOLD) as {
    total: number;
    nacional: number;
    internacional: number;
    radar: number;
    sources: number;
  };

  const byGenre: Record<string, number> = {};
  const genreRows = db
    .prepare("SELECT genre AS key, COUNT(*) AS count FROM articles GROUP BY genre")
    .all() as unknown as { key: string; count: number }[];
  for (const row of genreRows) byGenre[row.key] = Number(row.count);

  const byContinent: Record<string, number> = {};
  const continentRows = db
    .prepare("SELECT continent AS key, COUNT(*) AS count FROM articles GROUP BY continent")
    .all() as unknown as { key: string; count: number }[];
  for (const row of continentRows) byContinent[row.key] = Number(row.count);

  const byCountry: Record<string, number> = {};
  const countryRows = db
    .prepare(
      "SELECT country AS key, COUNT(*) AS count FROM articles WHERE country IS NOT NULL GROUP BY country",
    )
    .all() as unknown as { key: string; count: number }[];
  for (const row of countryRows) byCountry[row.key] = Number(row.count);

  return {
    total: Number(totals?.total ?? 0),
    nacional: Number(totals?.nacional ?? 0),
    internacional: Number(totals?.internacional ?? 0),
    radar: Number(totals?.radar ?? 0),
    sources: Number(totals?.sources ?? 0),
    byGenre,
    byContinent,
    byCountry,
    lastRefresh: getMeta("last_refresh"),
  };
}

export function getMeta(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

export function countArticles(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS total FROM articles").get() as
    | { total: number }
    | undefined;
  return Number(row?.total ?? 0);
}

export function listFavorites(): Article[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM favorites ORDER BY favorited_at DESC")
    .all() as unknown as FavoriteRow[];
  return rows.map(mapFavoriteRow);
}

export function getFavoriteIds(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM favorites").all() as unknown as {
    id: string;
  }[];
  return rows.map((row) => row.id);
}

export function addFavorite(articleId: string): Article | null {
  const db = getDb();
  const article = db
    .prepare("SELECT * FROM articles WHERE id = ?")
    .get(articleId) as unknown as ArticleRow | undefined;

  if (!article) return null;

  const favoritedAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO favorites (
      id, title, description, link, source_id, source_name, published_at,
      favorited_at, scope, country, continent, genre, relevance, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET favorited_at = excluded.favorited_at
  `).run(
    article.id,
    article.title,
    article.description,
    article.link,
    article.source_id,
    article.source_name,
    article.published_at,
    favoritedAt,
    article.scope,
    article.country,
    article.continent,
    article.genre,
    article.relevance,
    article.tags,
  );

  return mapFavoriteRow({
    id: article.id,
    title: article.title,
    description: article.description,
    link: article.link,
    source_id: article.source_id,
    source_name: article.source_name,
    published_at: article.published_at,
    favorited_at: favoritedAt,
    scope: article.scope,
    country: article.country,
    continent: article.continent,
    genre: article.genre,
    relevance: article.relevance,
    tags: article.tags,
  });
}

export function removeFavorite(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM favorites WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function pruneFavorites(
  days = FAVORITES_RETENTION_DAYS,
): number {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result = db.prepare("DELETE FROM favorites WHERE favorited_at < ?").run(cutoff);
  return Number(result.changes);
}

export function getArticleById(id: string): Article | null {
  const db = getDb();

  const article = db
    .prepare("SELECT * FROM articles WHERE id = ?")
    .get(id) as unknown as ArticleRow | undefined;
  if (article) return mapRow(article);

  const favorite = db
    .prepare("SELECT * FROM favorites WHERE id = ?")
    .get(id) as unknown as FavoriteRow | undefined;
  return favorite ? mapFavoriteRow(favorite) : null;
}

export function getCachedArticleContent(
  id: string,
): { html: string; fetchedAt: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT html, fetched_at FROM article_content WHERE article_id = ?")
    .get(id) as { html: string; fetched_at: string } | undefined;

  return row ? { html: row.html, fetchedAt: row.fetched_at } : null;
}

export function setCachedArticleContent(id: string, html: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO article_content (article_id, html, fetched_at)
    VALUES (?, ?, ?)
    ON CONFLICT(article_id) DO UPDATE SET
      html = excluded.html,
      fetched_at = excluded.fetched_at
  `).run(id, html, new Date().toISOString());
}

export function pruneArticleContent(
  days = ARTICLE_RETENTION_DAYS,
): number {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result = db
    .prepare("DELETE FROM article_content WHERE fetched_at < ?")
    .run(cutoff);
  return Number(result.changes);
}
