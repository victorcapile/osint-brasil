import type { Article, Stats } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import CountryPanel from "./CountryPanel";
import ViewHeader from "./ViewHeader";
import WorldMap from "./WorldMap";

interface MapViewProps {
  stats: Stats | null;
  articles: Article[];
  total: number;
  loading: boolean;
  country: string | null;
  favoriteIds: Set<string>;
  onToggleFavorite: (article: Article) => void;
  onCountrySelect: (code: string | null) => void;
  onOpenFeed: () => void;
}

export default function MapView({
  stats,
  articles,
  total,
  loading,
  country,
  favoriteIds,
  onToggleFavorite,
  onCountrySelect,
  onOpenFeed,
}: MapViewProps) {
  const countryCount = stats ? Object.keys(stats.byCountry ?? {}).length : 0;
  const geolocated = stats
    ? Object.values(stats.byCountry ?? {}).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <section>
      <ViewHeader
        eyebrow="Navegação geográfica"
        title="Mapa de cobertura"
        description="O tom indica o volume de notícias. Use a roda ou a pinça para zoom, arraste para mover e expanda para tela cheia."
      />

      <div className="grid gap-8 pt-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <WorldMap
          counts={stats?.byCountry ?? {}}
          selected={country}
          onSelect={onCountrySelect}
        />

        <aside className="border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <CountryPanel
            selected={country}
            stats={stats}
            articles={articles}
            total={total}
            loading={loading}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            onSelect={onCountrySelect}
            onOpenFeed={onOpenFeed}
          />
        </aside>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-faint">
        {stats
          ? `${countryCount} países · ${formatNumber(geolocated)} notícias geolocalizadas`
          : "Carregando dados geográficos…"}
      </p>
    </section>
  );
}
