import { NextRequest, NextResponse } from "next/server";
import {
  addFavorite,
  listFavorites,
  pruneFavorites,
  removeFavorite,
} from "@/lib/db";
import { FAVORITES_RETENTION_DAYS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  pruneFavorites(FAVORITES_RETENTION_DAYS);
  const favorites = listFavorites();

  return NextResponse.json(
    { favorites, total: favorites.length },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { articleId?: unknown }
    | null;
  const articleId =
    body && typeof body.articleId === "string" ? body.articleId : null;

  if (!articleId) {
    return NextResponse.json(
      { error: "articleId é obrigatório." },
      { status: 400 },
    );
  }

  pruneFavorites(FAVORITES_RETENTION_DAYS);
  const favorite = addFavorite(articleId);

  if (!favorite) {
    return NextResponse.json(
      { error: "Notícia não encontrada no acervo." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { favorite },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const removed = removeFavorite(id);
  return NextResponse.json(
    { ok: true, removed },
    { headers: { "cache-control": "no-store" } },
  );
}
