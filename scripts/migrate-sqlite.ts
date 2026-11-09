import { config } from "dotenv";

config({ path: ".env.local" });

import { DatabaseSync } from "node:sqlite";
import { normalize } from "../src/lib/text";
import type { Continent, Genre, Scope } from "../src/lib/types";

interface SqliteArticle {
  id: string;
  title: string;
  title_norm: string;
  search_text: string;
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

async function main() {
  const db = await import("../src/lib/db");
  const sqlite = new DatabaseSync("data/news.db", { readOnly: true });

  const rows = sqlite
    .prepare("SELECT * FROM articles")
    .all() as unknown as SqliteArticle[];

  const articles = rows.map((row) => {
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(row.tags);
      if (Array.isArray(parsed)) {
        tags = parsed.filter((tag): tag is string => typeof tag === "string");
      }
    } catch {
      tags = [];
    }

    return {
      id: row.id,
      title: row.title,
      titleNorm: row.title_norm,
      searchText:
        row.search_text ||
        normalize(`${row.title} ${row.description} ${row.source_name}`),
      description: row.description,
      link: row.link,
      sourceId: row.source_id,
      sourceName: row.source_name,
      publishedAt: row.published_at,
      fetchedAt: row.fetched_at,
      scope: row.scope,
      country: row.country ?? null,
      continent: row.continent,
      genre: row.genre,
      relevance: Number(row.relevance),
      tags,
    };
  });

  const inserted = await db.insertArticles(articles, { titleDedup: false });
  console.log(`artigos migrados: ${inserted} de ${rows.length}`);

  const meta = sqlite
    .prepare("SELECT key, value FROM meta")
    .all() as unknown as { key: string; value: string }[];
  for (const row of meta) {
    await db.setMeta(row.key, row.value);
  }

  const content = sqlite
    .prepare("SELECT article_id, html FROM article_content")
    .all() as unknown as { article_id: string; html: string }[];
  for (const row of content) {
    await db.setCachedArticleContent(row.article_id, row.html);
  }

  const favorites = sqlite
    .prepare("SELECT COUNT(*) AS total FROM favorites")
    .get() as unknown as { total: number };

  console.log(
    `meta: ${meta.length} · conteúdo: ${content.length} · favoritos no SQLite: ${favorites.total}`,
  );
  console.log(
    "Favoritos antigos não são migrados automaticamente; o acervo de artigos já permite favoritar de novo.",
  );

  sqlite.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
