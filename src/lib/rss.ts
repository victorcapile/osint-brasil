import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { classifyArticle } from "./classify";
import { normalize } from "./text";
import {
  getDb,
  insertArticles,
  pruneArticleContent,
  pruneFavorites,
  pruneOld,
  setMeta,
  type NewArticle,
} from "./db";
import { SOURCES, SOURCE_BY_ID, type FeedSource } from "./sources";
import { ARTICLE_RETENTION_DAYS, type RefreshResult } from "./types";

const MAX_AGE_DAYS = ARTICLE_RETENTION_DAYS;
const MAX_ITEMS_PER_SOURCE = 40;
const FETCH_TIMEOUT_MS = 20_000;

interface CustomItem {
  contentEncoded?: string;
  mediaContent?: unknown;
  source?: string | { _?: string };
}

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
    ],
  },
});

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const value = hex ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      if (Number.isFinite(value)) {
        try {
          return String.fromCodePoint(value);
        } catch {
          return " ";
        }
      }
      return " ";
    }
    return ENTITIES[code.toLowerCase()] ?? " ";
  });
}

function cleanHtml(input?: string): string {
  if (!input) return "";
  const text = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

/** Remove rodapés automáticos comuns em feeds (WordPress, “leia mais” etc.). */
function stripBoilerplate(input: string): string {
  return input
    .replace(/\s*(The post|O post)\s+[\s\S]*?\s+appeared first on\s+[^.]*\.?/gi, " ")
    .replace(/\s*(Leia mais|Continue reading|Read more)\b[\s\S]*$/gi, " ")
    .replace(/\s*Publicado originalmente em\b[\s\S]*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max = 280): string {
  if (input.length <= max) return input;
  const slice = input.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
}

function parseDate(item: Parser.Item & CustomItem): Date | null {
  const raw =
    item.isoDate ??
    item.pubDate ??
    (item as { date?: string }).date ??
    (item as { published?: string }).published ??
    (item as { updated?: string }).updated;

  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  // Evita datas no futuro (comum em feeds mal configurados).
  if (date.getTime() > Date.now() + 60_000) return new Date();
  return date;
}

function stripPublisherSuffix(title: string): string {
  return title.replace(/\s+[-–—]\s+[^-–—]{2,48}$/u, "").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTrailingPublisher(text: string, publisher: string | null): string {
  if (!publisher) return text;
  const pattern = new RegExp(`\\s*[-–—|·]\\s*${escapeRegExp(publisher)}\\s*$`, "iu");
  return text.replace(pattern, "").trim();
}

/** Detecta resumos que são apenas o título (ou o título + veículo). */
function isRedundant(description: string, title: string): boolean {
  const body = normalize(description);
  const headline = normalize(title);
  if (!body || !headline) return true;
  if (body === headline) return true;
  if (body.startsWith(headline) && body.length <= headline.length + 60) return true;
  if (headline.startsWith(body) && headline.length <= body.length + 20) return true;
  return false;
}

/**
 * Decodifica o XML com fallback para Latin-1 (feeds antigos, ex.: UOL)
 * e conserta o caso de `<rss>` sem atributo `version`, que o parser rejeita.
 */
function decodeXml(buffer: ArrayBuffer): string {
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    xml = new TextDecoder("latin1").decode(buffer);
  }

  xml = xml.replace(/^\uFEFF/, "");
  if (/^<rss(\s*)>/i.test(xml)) {
    xml = xml.replace(/^<rss(\s*)>/i, '<rss version="2.0"$1>');
  }
  return xml;
}

function publisherFrom(item: Parser.Item & CustomItem): string | null {
  const value = item.source;
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value._ === "string") {
    return value._.trim();
  }
  return null;
}

function toArticle(
  item: Parser.Item & CustomItem,
  source: FeedSource,
  fetchedAt: string,
  cutoff: number,
): NewArticle | null {
  const rawTitle = cleanHtml(item.title);
  if (!rawTitle) return null;

  const link = (item.link ?? item.guid ?? "").trim();
  if (!/^https?:\/\//i.test(link)) return null;

  const published = parseDate(item);
  if (!published || published.getTime() < cutoff) return null;

  const isGoogle = source.id.startsWith("gn-");
  const title = isGoogle ? stripPublisherSuffix(rawTitle) : rawTitle;
  if (title.length < 8) return null;

  const publisher = isGoogle ? publisherFrom(item) : null;
  const sourceName = publisher ? `${source.name} · ${publisher}` : source.name;

  const body = stripBoilerplate(
    cleanHtml(item.contentSnippet) ||
      cleanHtml(item.summary) ||
      cleanHtml(item.content) ||
      cleanHtml(item.contentEncoded),
  );

  let description = truncate(body);
  if (isGoogle) {
    description = stripTrailingPublisher(description, publisher);
  }
  if (description && (isRedundant(description, title) || isRedundant(description, rawTitle))) {
    description = "";
  }

  const classification = classifyArticle(title, description, source);

  return {
    id: createHash("sha1").update(link).digest("hex"),
    title,
    titleNorm: normalize(title),
    searchText: normalize(`${title} ${description} ${sourceName}`),
    description,
    link,
    sourceId: source.id,
    sourceName,
    publishedAt: published.toISOString(),
    fetchedAt,
    scope: classification.scope,
    country: classification.country,
    continent: classification.continent,
    genre: classification.genre,
    relevance: classification.relevance,
    tags: classification.tags,
  };
}

async function fetchSource(source: FeedSource, fetchedAt: string): Promise<NewArticle[]> {
  const response = await fetch(source.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 RadarOSINT/0.1",
      accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8,es;q=0.7",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = decodeXml(await response.arrayBuffer());
  if (!xml || xml.length < 100) {
    throw new Error("resposta vazia");
  }

  const feed = await parser.parseString(xml);
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_SOURCE);
  const articles: NewArticle[] = [];

  for (const item of items as (Parser.Item & CustomItem)[]) {
    const article = toArticle(item, source, fetchedAt, cutoff);
    if (article) articles.push(article);
  }

  return articles;
}

/**
 * Reaplica a classificação em todo o acervo. Isso mantém o banco consistente
 * quando as regras heurísticas mudam e corrige itens que já saíram do feed.
 */
function reclassifyAll(): void {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, title, description, source_id, source_name FROM articles")
    .all() as unknown as {
    id: string;
    title: string;
    description: string;
    source_id: string;
    source_name: string;
  }[];
  if (rows.length === 0) return;

  const update = db.prepare(`
    UPDATE articles SET
      description = ?,
      genre       = ?,
      scope       = ?,
      country     = ?,
      continent   = ?,
      relevance   = ?,
      tags        = ?,
      search_text = ?
    WHERE id = ?
  `);

  db.exec("BEGIN");
  try {
    for (const row of rows) {
      const source = SOURCE_BY_ID.get(row.source_id);
      if (!source) continue;

      const description = stripBoilerplate(row.description);
      const classification = classifyArticle(row.title, description, source);

      update.run(
        description,
        classification.genre,
        classification.scope,
        classification.country,
        classification.continent,
        classification.relevance,
        JSON.stringify(classification.tags),
        normalize(`${row.title} ${description} ${row.source_name}`),
        row.id,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function ingestAll(): Promise<RefreshResult> {
  const started = Date.now();
  const fetchedAt = new Date().toISOString();

  const results = await Promise.allSettled(
    SOURCES.map((source) => fetchSource(source, fetchedAt)),
  );

  const collected: NewArticle[] = [];
  const errors: { source: string; message: string }[] = [];
  let okSources = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      okSources += 1;
      collected.push(...result.value);
      return;
    }
    const reason = result.reason;
    errors.push({
      source: SOURCES[index].name,
      message: truncate(
        reason instanceof Error ? reason.message : String(reason),
        180,
      ),
    });
  });

  // Deduplica por link dentro do mesmo lote.
  const seen = new Set<string>();
  const unique = collected.filter((article) => {
    if (seen.has(article.link)) return false;
    seen.add(article.link);
    return true;
  });

  const inserted = insertArticles(unique);
  pruneOld(MAX_AGE_DAYS);
  pruneFavorites();
  pruneArticleContent();
  reclassifyAll();

  const lastRefresh = new Date().toISOString();
  setMeta("last_refresh", lastRefresh);

  return {
    ok: true,
    sources: SOURCES.length,
    okSources,
    failedSources: errors.length,
    collected: unique.length,
    inserted,
    durationMs: Date.now() - started,
    errors,
    lastRefresh,
  };
}
