import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/rss";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const result = await ingestAll();
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha desconhecida na coleta",
      },
      { status: 500 },
    );
  }
}
