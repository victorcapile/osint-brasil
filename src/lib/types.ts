export type Genre =
  | "geopolitica"
  | "negocios"
  | "ciencia"
  | "esportes"
  | "seguranca"
  | "tecnologia"
  | "saude"
  | "geral";

export type Continent =
  | "brasil"
  | "america-sul"
  | "america-norte"
  | "america-central"
  | "europa"
  | "oriente-medio"
  | "asia"
  | "africa"
  | "oceania"
  | "global";

export type Scope = "nacional" | "internacional";

export type SortMode = "recentes" | "relevancia";

export interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
  scope: Scope;
  country: string | null;
  continent: Continent;
  genre: Genre;
  relevance: number;
  tags: string[];
  favoritedAt?: string;
}

export interface FavoritesResponse {
  favorites: Article[];
  total: number;
}

export interface Stats {
  total: number;
  nacional: number;
  internacional: number;
  radar: number;
  sources: number;
  byGenre: Record<string, number>;
  byContinent: Record<string, number>;
  byCountry: Record<string, number>;
  lastRefresh: string | null;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
  radar: Article[];
  stats: Stats;
  generatedAt: string;
}

export interface RefreshResult {
  ok: boolean;
  sources: number;
  okSources: number;
  failedSources: number;
  collected: number;
  inserted: number;
  durationMs: number;
  errors: { source: string; message: string }[];
  lastRefresh: string;
}

export const GENRE_ORDER: Genre[] = [
  "geopolitica",
  "negocios",
  "ciencia",
  "esportes",
  "seguranca",
  "tecnologia",
  "saude",
  "geral",
];

export const GENRE_META: Record<Genre, { label: string }> = {
  geopolitica: { label: "Geopolítica" },
  negocios: { label: "Negócios" },
  ciencia: { label: "Ciência" },
  esportes: { label: "Esportes" },
  seguranca: { label: "Segurança" },
  tecnologia: { label: "Tecnologia" },
  saude: { label: "Saúde" },
  geral: { label: "Geral" },
};

export const CONTINENT_ORDER: Continent[] = [
  "brasil",
  "america-sul",
  "america-norte",
  "america-central",
  "europa",
  "oriente-medio",
  "asia",
  "africa",
  "oceania",
  "global",
];

export const CONTINENT_META: Record<Continent, { label: string; short: string }> = {
  brasil: { label: "Brasil", short: "BR" },
  "america-sul": { label: "América do Sul", short: "AMS" },
  "america-norte": { label: "América do Norte", short: "AMN" },
  "america-central": { label: "América Central e Caribe", short: "AMC" },
  europa: { label: "Europa", short: "EUR" },
  "oriente-medio": { label: "Oriente Médio", short: "OME" },
  asia: { label: "Ásia", short: "ASI" },
  africa: { label: "África", short: "AFR" },
  oceania: { label: "Oceania", short: "OCE" },
  global: { label: "Global / Multirregional", short: "GLB" },
};

export const TAG_LABELS: Record<string, string> = {
  amazonia: "Amazônia",
  defesa: "Defesa",
  fronteiras: "Fronteiras",
  geopolitica: "Geopolítica",
  energia: "Energia",
  economia: "Economia",
  seguranca: "Segurança",
  ciber: "Ciber",
  ciencia: "Ciência & Tech",
  saude: "Saúde",
  politica: "Política",
};

export const RADAR_THRESHOLD = 5;

/** Retenção dos links no banco: 1 mês. */
export const ARTICLE_RETENTION_DAYS = 30;
export const FAVORITES_RETENTION_DAYS = 30;
