import { config } from "dotenv";

config({ path: ".env.local" });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente");

  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
  });

  const result = await sql`DELETE FROM article_content`;
  console.log("cache de leitura limpo:", result.count ?? result.length);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
