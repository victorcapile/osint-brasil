import { explainGenre } from "../src/lib/classify";
import { SOURCE_BY_ID } from "../src/lib/sources";

const query = process.argv[2];
const sourceFilter = process.argv[3];

if (!query) {
  console.error('Uso: npm run tune -- "termo de busca" [sourceId]');
  process.exit(1);
}

async function main() {
  const url = `http://localhost:3000/api/articles?${new URLSearchParams({
    q: query,
    limit: "50",
  })}`;
  const payload = (await fetch(url).then((response) => response.json())) as {
    articles: { title: string; description: string; sourceId: string; genre: string }[];
  };

  const articles = payload.articles.filter(
    (article) => !sourceFilter || article.sourceId === sourceFilter,
  );

  if (articles.length === 0) {
    console.log("Nenhuma notícia encontrada. O servidor está rodando em localhost:3000?");
    return;
  }

  for (const article of articles) {
    const source = SOURCE_BY_ID.get(article.sourceId);
    if (!source) continue;

    const explanation = explainGenre(article.title, article.description, source);
    const matched = Object.entries(explanation.matches)
      .filter(([, value]) => value.strong.length > 0 || value.weak.length > 0)
      .map(([key, value]) => ({
        genre: key,
        score: explanation.scores[key],
        strong: value.strong,
        weak: value.weak,
      }));

    console.log(`\nTITLE: ${article.title}`);
    console.log(
      `SOURCE: ${article.sourceId} (hint: ${source.genreHint}) | DB: ${article.genre} | NOW: ${explanation.genre}`,
    );
    console.log(JSON.stringify(matched, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
