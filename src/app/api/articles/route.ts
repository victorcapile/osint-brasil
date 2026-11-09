import { NextRequest, NextResponse } from "next/server";
import {
  countArticlesFiltered,
  getRadar,
  getStats,
  queryArticles,
} from "@/lib/db";
import {
  CONTINENT_ORDER,
  GENRE_ORDER,
  type Continent,
  type Genre,
  type Scope,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function readScope(value: string | null): Scope | undefined {
  return value === "nacional" || value === "internacional" ? value : undefined;
}

function readGenre(value: string | null): Genre | undefined {
  return value && (GENRE_ORDER as string[]).includes(value) ? (value as Genre) : undefined;
}

function readContinent(value: string | null): Continent | undefined {
  return value && (CONTINENT_ORDER as string[]).includes(value)
    ? (value as Continent)
    : undefined;
}

function readCountry(value: string | null): string | undefined {
  if (!value) return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const minRelevanceRaw = Number(searchParams.get("minRelevance"));
  const limitRaw = Number(searchParams.get("limit"));

  const filters = {
    scope: readScope(searchParams.get("scope")),
    genre: readGenre(searchParams.get("genre")),
    continent: readContinent(searchParams.get("continent")),
    country: readCountry(searchParams.get("country")),
    q: searchParams.get("q")?.slice(0, 120) ?? undefined,
    minRelevance:
      Number.isFinite(minRelevanceRaw) && minRelevanceRaw > 0 ? minRelevanceRaw : undefined,
    sort:
      searchParams.get("sort") === "relevancia"
        ? ("relevancia" as const)
        : ("recentes" as const),
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 150,
  };

  const payload = {
    articles: queryArticles(filters),
    total: countArticlesFiltered(filters),
    radar: getRadar(40),
    stats: getStats(),
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
