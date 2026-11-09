import postgres from "postgres";
import type {
  Article,
  Continent,
  Genre,
  Scope,
  Stats,
} from "./types";
import {
  ARTICLE_RETENTION_DAYS,
  FAVORITES_RETENTION_DAYS,
  RADAR_THRESHOLD,
} from "./types";

const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
  __pgSchema?: Promise<void>;
};

function getSql() {
  if (globalForDb.__pg) return globalForDb.__pg;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Crie um banco Neon/Supabase ou rode `vercel env pull`.",
    );
  }

  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });

  globalForDb.__pg = sql;
  return sql;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS articles (
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
    relevance    DOUBLE PRECISION NOT NULL DEFAULT 0,
    tags         TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_genre ON articles(genre)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_continent ON articles(continent)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_relevance ON articles(relevance DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_title_norm ON articles(title_norm)`,
  `CREATE TABLE IF NOT EXISTS favorites (
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
    relevance    DOUBLE PRECISION NOT NULL DEFAULT 0,
    tags         TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_favorites_favorited ON favorites(favorited_at DESC)`,
  `CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS article_content (
    article_id TEXT PRIMARY KEY,
    html       TEXT NOT NULL DEFAULT '',
    fetched_at TEXT NOT NULL
  )`,
];

export async function ensureSchema(): Promise<void> {
  if (!globalForDb.__pgSchema) {
    globalForDb.__pgSchema = (async () => {
      const sql = getSql();
      for (const statement of SCHEMA_STATEMENTS) {
        await sql.unsafe(statement);
      }
    })().catch((error) => {
      globalForDb.__pgSchema = undefined;
      throw error;
    });
  }

  return globalForDb.__pgSchema;
}

function toPg(text: string): string {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql.unsafe(toPg(text), params as any[]);
  return rows as unknown as T[];
}

async function run(text: string, params: unknown[] = []): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const result = (await sql.unsafe(toPg(text), params as any[])) as unknown as {
    count?: number;
    length?: number;
  };
  return Number(result.count ?? result.length ?? 0);
}

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
  relevance: number | string;
  tags: string;
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
  relevance: number | string;
  tags: string;
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

export async function insertArticles(
  rows: NewArticle[],
  options: { titleDedup?: boolean } = {},
): Promise<number> {
  if (rows.length === 0) return 0;

  const titleDedup = options.titleDedup !== false;
  const existing = await query<{ id: string; title_norm: string }>(
    "SELECT id, title_norm FROM articles",
  );
  const ids = new Set(existing.map((row) => row.id));
  const titles = new Set(existing.map((row) => row.title_norm));

  const toInsert: NewArticle[] = [];
  for (const row of rows) {
    if (ids.has(row.id)) continue;
    if (titleDedup && titles.has(row.titleNorm)) continue;
    ids.add(row.id);
    titles.add(row.titleNorm);
    toInsert.push(row);
  }

  const CHUNK = 200;
  for (let offset = 0; offset < toInsert.length; offset += CHUNK) {
    const chunk = toInsert.slice(offset, offset + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) => {
      const base = values.length;
      values.push(
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
        JSON.stringify(row.tags),
      );
      return `(${Array.from({ length: 16 }, (_, index) => `$${base + index + 1}`).join(", ")})`;
    });

    await run(
      `INSERT INTO articles (
        id, title, title_norm, search_text, description, link, source_id,
        source_name, published_at, fetched_at, scope, country, continent,
        genre, relevance, tags
      ) VALUES ${tuples.join(", ")}
      ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }

  return toInsert.length;
}

export async function pruneOld(days = ARTICLE_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  return run("DELETE FROM articles WHERE published_at < ?", [cutoff]);
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
    const tokens = filters.q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
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

export async function queryArticles(filters: QueryFilters): Promise<Article[]> {
  const { clause, params } = buildWhere(filters);
  const order =
    filters.sort === "relevancia"
      ? "relevance DESC, published_at DESC"
      : "published_at DESC, relevance DESC";
  const limit = Math.max(1, Math.min(filters.limit ?? 120, 300));

  const rows = await query<ArticleRow>(
    `SELECT * FROM articles ${clause} ORDER BY ${order} LIMIT ?`,
    [...params, limit],
  );
  return rows.map(mapRow);
}

export async function countArticlesFiltered(
  filters: QueryFilters,
): Promise<number> {
  const { clause, params } = buildWhere(filters);
  const rows = await query<{ total: number | string }>(
    `SELECT COUNT(*) AS total FROM articles ${clause}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getRadar(limit = 6): Promise<Article[]> {
  const rows = await query<ArticleRow>(
    `SELECT * FROM articles
     WHERE relevance >= ?
     ORDER BY relevance DESC, published_at DESC
     LIMIT ?`,
    [RADAR_THRESHOLD, limit],
  );
  return rows.map(mapRow);
}

export async function getStats(): Promise<Stats> {
  const totalsRows = await query<{
    total: number | string;
    nacional: number | string;
    internacional: number | string;
    radar: number | string;
    sources: number | string;
  }>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN scope = 'nacional' THEN 1 ELSE 0 END), 0) AS nacional,
       COALESCE(SUM(CASE WHEN scope = 'internacional' THEN 1 ELSE 0 END), 0) AS internacional,
       COALESCE(SUM(CASE WHEN relevance >= ? THEN 1 ELSE 0 END), 0) AS radar,
       COUNT(DISTINCT source_id) AS sources
     FROM articles`,
    [RADAR_THRESHOLD],
  );
  const totals = totalsRows[0];

  const byGenre: Record<string, number> = {};
  const genreRows = await query<{ key: string; count: number | string }>(
    "SELECT genre AS key, COUNT(*) AS count FROM articles GROUP BY genre",
  );
  for (const row of genreRows) byGenre[row.key] = Number(row.count);

  const byContinent: Record<string, number> = {};
  const continentRows = await query<{ key: string; count: number | string }>(
    "SELECT continent AS key, COUNT(*) AS count FROM articles GROUP BY continent",
  );
  for (const row of continentRows) byContinent[row.key] = Number(row.count);

  const byCountry: Record<string, number> = {};
  const countryRows = await query<{ key: string; count: number | string }>(
    "SELECT country AS key, COUNT(*) AS count FROM articles WHERE country IS NOT NULL GROUP BY country",
  );
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
    lastRefresh: await getMeta("last_refresh"),
  };
}

export async function getMeta(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM meta WHERE key = ? LIMIT 1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  );
}

export async function countArticles(): Promise<number> {
  const rows = await query<{ total: number | string }>(
    "SELECT COUNT(*) AS total FROM articles",
  );
  return Number(rows[0]?.total ?? 0);
}

export async function listFavorites(): Promise<Article[]> {
  const rows = await query<FavoriteRow>(
    "SELECT * FROM favorites ORDER BY favorited_at DESC",
  );
  return rows.map(mapFavoriteRow);
}

export async function getFavoriteIds(): Promise<string[]> {
  const rows = await query<{ id: string }>("SELECT id FROM favorites");
  return rows.map((row) => row.id);
}

export async function addFavorite(articleId: string): Promise<Article | null> {
  const rows = await query<ArticleRow>(
    "SELECT * FROM articles WHERE id = ? LIMIT 1",
    [articleId],
  );
  const article = rows[0];
  if (!article) return null;

  const favoritedAt = new Date().toISOString();
  await run(
    `INSERT INTO favorites (
      id, title, description, link, source_id, source_name, published_at,
      favorited_at, scope, country, continent, genre, relevance, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET favorited_at = EXCLUDED.favorited_at`,
    [
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
    ],
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

export async function removeFavorite(id: string): Promise<boolean> {
  const changes = await run("DELETE FROM favorites WHERE id = ?", [id]);
  return changes > 0;
}

export async function pruneFavorites(
  days = FAVORITES_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  return run("DELETE FROM favorites WHERE favorited_at < ?", [cutoff]);
}

export async function getArticleById(id: string): Promise<Article | null> {
  const articles = await query<ArticleRow>(
    "SELECT * FROM articles WHERE id = ? LIMIT 1",
    [id],
  );
  if (articles[0]) return mapRow(articles[0]);

  const favorites = await query<FavoriteRow>(
    "SELECT * FROM favorites WHERE id = ? LIMIT 1",
    [id],
  );
  return favorites[0] ? mapFavoriteRow(favorites[0]) : null;
}

export async function getCachedArticleContent(
  id: string,
): Promise<{ html: string; fetchedAt: string } | null> {
  const rows = await query<{ html: string; fetched_at: string }>(
    "SELECT html, fetched_at FROM article_content WHERE article_id = ? LIMIT 1",
    [id],
  );
  const row = rows[0];
  return row ? { html: row.html, fetchedAt: row.fetched_at } : null;
}

export async function setCachedArticleContent(
  id: string,
  html: string,
): Promise<void> {
  await run(
    `INSERT INTO article_content (article_id, html, fetched_at)
     VALUES (?, ?, ?)
     ON CONFLICT (article_id) DO UPDATE SET
       html = EXCLUDED.html,
       fetched_at = EXCLUDED.fetched_at`,
    [id, html, new Date().toISOString()],
  );
}

export async function pruneArticleContent(
  days = ARTICLE_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  return run("DELETE FROM article_content WHERE fetched_at < ?", [cutoff]);
}

export interface ArticleBasic {
  id: string;
  title: string;
  description: string;
  source_id: string;
  source_name: string;
}

export async function getAllArticleBasics(): Promise<ArticleBasic[]> {
  return query<ArticleBasic>(
    "SELECT id, title, description, source_id, source_name FROM articles",
  );
}

export interface ClassificationUpdate {
  id: string;
  description: string;
  genre: Genre;
  scope: Scope;
  country: string | null;
  continent: Continent;
  relevance: number;
  tags: string[];
  searchText: string;
}

export async function updateArticleClassifications(
  rows: ClassificationUpdate[],
): Promise<void> {
  const CHUNK = 150;

  for (let offset = 0; offset < rows.length; offset += CHUNK) {
    const chunk = rows.slice(offset, offset + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) => {
      const base = values.length;
      values.push(
        row.id,
        row.description,
        row.genre,
        row.scope,
        row.country,
        row.continent,
        row.relevance,
        JSON.stringify(row.tags),
        row.searchText,
      );
      return `($${base + 1}::text, $${base + 2}::text, $${base + 3}::text, $${base + 4}::text, $${base + 5}::text, $${base + 6}::text, $${base + 7}::double precision, $${base + 8}::text, $${base + 9}::text)`;
    });

    await run(
      `UPDATE articles AS a SET
        description = v.description,
        genre       = v.genre,
        scope       = v.scope,
        country     = v.country,
        continent   = v.continent,
        relevance   = v.relevance,
        tags        = v.tags,
        search_text = v.search_text
      FROM (VALUES ${tuples.join(", ")}) AS v(
        id, description, genre, scope, country, continent, relevance, tags, search_text
      )
      WHERE a.id = v.id`,
      values,
    );
  }
}
