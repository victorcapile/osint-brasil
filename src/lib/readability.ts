import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import sanitizeHtml from "sanitize-html";

const FETCH_TIMEOUT_MS = 12_000;

const ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags.concat([
  "img",
  "figure",
  "figcaption",
  "picture",
  "source",
  "h1",
  "h2",
]);

function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return value;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

/**
 * Busca a página original e extrai o texto principal com Readability.
 * Retorna HTML sanitizado, ou null quando o site bloqueia/limita o acesso.
 */
export async function extractArticleContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 RadarOSINT/0.1",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    if (html.length < 500) return null;

    const dom = parseHTML(html);
    const reader = new Readability(dom.document as unknown as Document);
    const parsed = reader.parse();

    if (!parsed?.content) return null;

    const clean = sanitizeHtml(parsed.content, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        a: ["href", "title"],
        img: ["src", "srcset", "alt", "width", "height", "loading"],
        source: ["src", "srcset", "type", "media"],
        "*": ["dir", "lang"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      transformTags: {
        a: (tagName, attribs) => ({
          tagName,
          attribs: {
            ...attribs,
            href: absoluteUrl(attribs.href, url) ?? "",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }),
        img: (tagName, attribs) => ({
          tagName,
          attribs: {
            ...attribs,
            src: absoluteUrl(attribs.src, url) ?? "",
            loading: "lazy",
          },
        }),
      },
    });

    const plain = sanitizeHtml(clean, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

    if (plain.length < 200) return null;

    return clean;
  } catch {
    return null;
  }
}
