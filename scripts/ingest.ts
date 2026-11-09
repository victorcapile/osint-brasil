import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { ingestAll } = await import("../src/lib/rss");
  const result = await ingestAll();

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        sources: result.sources,
        okSources: result.okSources,
        failedSources: result.failedSources,
        collected: result.collected,
        inserted: result.inserted,
        durationMs: result.durationMs,
        errors: result.errors,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
