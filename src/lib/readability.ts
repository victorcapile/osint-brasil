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

const AD_PLACEHOLDER =
  /^(publicidade|publicity|advertisement|ad|anúncio|anuncio|continua após a publicidade|continua depois da publicidade|story continues below advertisement|leia também|leia mais|veja também|saiba mais)$/i;

const PARTIAL_MARKERS =
  /(continue lendo|continue a ler|para continuar lendo|assine para|exclusivo para assinantes|conteúdo para assinantes|conteúdo exclusivo para assinantes|assine o|seja assinante|subscribe to continue|sign in to continue|you have reached your limit|this article is for subscribers)/i;

/** Remove blocos de publicidade e chamadas de “leia mais” que sobram no texto. */
function stripAdPlaceholders(html: string): string {
  const dom = parseHTML(`<div id="__article-root">${html}</div>`);
  const document = dom.document as unknown as Document;
  const root = document.getElementById("__article-root") as Element | null;
  if (!root) return html;

  const candidates = Array.from(
    root.querySelectorAll("p, div, span, figure, aside, section"),
  );

  for (const element of candidates) {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!AD_PLACEHOLDER.test(text)) continue;

    let target: Element = element;
    if (element.tagName === "SPAN" && element.parentElement) {
      target = element.parentElement;
    }
    const block = target.parentElement;
    if (block && (block.textContent ?? "").replace(/\s+/g, " ").trim() === text) {
      target = block;
    }
    target.remove();
  }

  for (const image of Array.from(root.querySelectorAll("img"))) {
    const alt = (image.getAttribute("alt") ?? "").trim();
    if (!AD_PLACEHOLDER.test(alt)) continue;

    // Nunca subir até um div: ele pode ser o container do artigo inteiro.
    const figure = image.closest("figure");
    if (figure) {
      figure.remove();
      continue;
    }

    const parent = image.parentElement;
    if (
      parent &&
      parent.children.length === 1 &&
      (parent.textContent ?? "").trim() === ""
    ) {
      parent.remove();
      continue;
    }

    image.remove();
  }

  return root.innerHTML;
}

/** Heurística para saber se a extração parece ter vindo incompleta. */
export function isPartialArticleContent(html: string): boolean {
  const text = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 400) return true;
  return PARTIAL_MARKERS.test(text);
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

    const sanitized = sanitizeHtml(parsed.content, {
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

    const clean = stripAdPlaceholders(sanitized);

    const plain = sanitizeHtml(clean, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

    if (plain.length < 200) return null;

    return clean;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[readability] falha na extração:", error);
    }
    return null;
  }
}
