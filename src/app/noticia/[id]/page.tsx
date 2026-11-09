import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import {
  getArticleById,
  getCachedArticleContent,
  setCachedArticleContent,
} from "@/lib/db";
import {
  CONTINENT_META,
  GENRE_META,
  RADAR_THRESHOLD,
  TAG_LABELS,
} from "@/lib/types";
import {
  formatArticleDate,
  formatClock,
  formatRelevance,
} from "@/lib/format";
import {
  extractArticleContent,
  isPartialArticleContent,
} from "@/lib/readability";

export const dynamic = "force-dynamic";

const CONTENT_RETRY_MS = 6 * 60 * 60 * 1000;

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);
  return {
    title: article ? `${article.title} — Radar OSINT` : "Notícia — Radar OSINT",
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const cached = await getCachedArticleContent(id);
  let contentHtml = cached?.html ?? "";

  if (!contentHtml) {
    const fetchedAt = cached?.fetchedAt
      ? new Date(cached.fetchedAt).getTime()
      : 0;
    const shouldRetry = !cached || Date.now() - fetchedAt > CONTENT_RETRY_MS;

    if (shouldRetry) {
      const extracted = await extractArticleContent(article.link);
      await setCachedArticleContent(id, extracted ?? "");
      contentHtml = extracted ?? "";
    }
  }

  const contentPartial = contentHtml
    ? isPartialArticleContent(contentHtml)
    : true;

  const genre = GENRE_META[article.genre];
  const region = CONTINENT_META[article.continent];
  const tags = article.tags
    .map((tag) => TAG_LABELS[tag])
    .filter((tag): tag is string => Boolean(tag));
  const isRadar = article.relevance >= RADAR_THRESHOLD;

  return (
    <div className="min-h-screen">
      <div className="h-[3px] bg-ink" />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
          <Link
            href="/"
            className="font-serif text-[20px] tracking-tight text-ink"
          >
            Radar OSINT
          </Link>
          <BackButton />
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-faint">
          <span className="text-accent">{genre.label}</span>
          <span className="text-line-strong">·</span>
          <span>{region.label}</span>
          <span className="text-line-strong">·</span>
          <span>
            {formatArticleDate(article.publishedAt)} ·{" "}
            {formatClock(article.publishedAt)}
          </span>
          {isRadar ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-accent">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
              Radar {formatRelevance(article.relevance)}
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 font-serif text-[34px] leading-[1.12] tracking-tight text-ink sm:text-[42px]">
          {article.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-faint">
          <span className="text-ink-soft">{article.sourceName}</span>
        </div>

        {tags.length > 0 ? (
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-faint">
            {tags.join(" · ")}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
          >
            Ler no veículo original ↗
          </a>
          <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
            {article.sourceName}
          </span>
        </div>

        {contentHtml ? (
          <>
            <div
              className="reader-content mt-8"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            {contentPartial ? (
              <p className="mt-8 border-l-2 border-line-strong pl-4 text-[12px] leading-relaxed text-faint">
                Não foi possível captar a notícia na íntegra.{" "}
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
                >
                  Ler no veículo original ↗
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <div className="mt-8">
            <p className="text-[16px] leading-relaxed text-muted">
              {article.description || "Resumo não disponível."}
            </p>
            <p className="mt-6 border-l-2 border-line-strong pl-4 text-[12px] leading-relaxed text-faint">
              Não foi possível captar a notícia na íntegra.{" "}
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
              >
                Ler no veículo original ↗
              </a>
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
          >
            Ler no veículo original ↗
          </a>
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.16em] text-faint transition hover:text-ink"
          >
            Voltar ao Radar
          </Link>
        </div>
      </main>
    </div>
  );
}
