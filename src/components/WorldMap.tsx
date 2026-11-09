"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAzimuthalEqualArea, geoEqualEarth, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import {
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { COUNTRY_BY_CODE } from "@/lib/country-data";
import { useTheme } from "./ThemeProvider";

interface CountryProperties {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  NAME_PT?: string;
  NAME_EN?: string;
  CONTINENT?: string;
}

const DESKTOP_WIDTH = 960;
// Equal Earth tem proporção próxima de 2:1.
const DESKTOP_HEIGHT = 480;
// No mobile, um disco equal-area centrado no Brasil ocupa muito melhor a tela.
const MOBILE_SIZE = 620;
const MAX_ZOOM = 10;
const LIGHT_HEAT = ["#ece7dc", "#d8d1c4", "#bbb2a2", "#8c8374", "#575149", "#1d1b18"];
const DARK_HEAT = ["#1b1f27", "#2c313b", "#454b57", "#6d7280", "#a9a398", "#f3efe7"];

function featureCode(properties: CountryProperties): string | null {
  const iso = properties.ISO_A2 ?? "";
  if (/^[A-Z]{2}$/.test(iso)) return iso;
  const eh = properties.ISO_A2_EH ?? "";
  if (/^[A-Z]{2}$/.test(eh)) return eh;
  return null;
}

function heatColor(count: number, palette: string[]): string {
  if (count <= 0) return palette[0];
  if (count < 3) return palette[1];
  if (count < 10) return palette[2];
  if (count < 30) return palette[3];
  if (count < 100) return palette[4];
  return palette[5];
}

interface WorldMapProps {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

export default function WorldMap({ counts, selected, onSelect }: WorldMapProps) {
  const [data, setData] = useState<FeatureCollection<
    Geometry,
    CountryProperties
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches,
  );
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const heat = isDark ? DARK_HEAT : LIGHT_HEAT;
  const borderStroke = isDark ? "#0e1014" : "#f4f1ea";
  const hoverStroke = isDark ? "#f2efe8" : "#161513";
  const selectedStroke = isDark ? "#d19a9a" : "#7a1f1f";

  const width = isMobile ? MOBILE_SIZE : DESKTOP_WIDTH;
  const height = isMobile ? MOBILE_SIZE : DESKTOP_HEIGHT;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const pointerRef = useRef<{ x: number; y: number; moved: boolean } | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    fetch("/geo/countries.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("map");
        return response.json() as Promise<
          FeatureCollection<Geometry, CountryProperties>
        >;
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o mapa.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const paths = useMemo(() => {
    if (!data) return [];

    const projection = isMobile
      ? geoAzimuthalEqualArea()
          .rotate([55, 10])
          .fitExtent(
            [
              [12, 12],
              [width - 12, height - 12],
            ],
            data,
          )
      : geoEqualEarth().fitExtent(
          [
            [12, 12],
            [width - 12, height - 12],
          ],
          data,
        );
    const path = geoPath(projection);

    return data.features.map((feature, index) => {
      const properties = feature.properties ?? {};
      const code = featureCode(properties);
      const name = code
        ? COUNTRY_BY_CODE.get(code)?.name ?? properties.NAME_PT ?? code
        : properties.NAME_PT ?? properties.NAME_EN ?? "—";
      const count = code ? counts[code] ?? 0 : 0;

      return {
        key: `${code ?? "x"}-${index}`,
        d: path(feature) ?? "",
        code,
        name,
        count,
      };
    });
  }, [data, counts, isMobile]);

  useEffect(() => {
    if (!data || !svgRef.current || !groupRef.current) return;

    const svg = select(svgRef.current);
    const group = select(groupRef.current);
    group.attr("transform", null);
    setZoomLevel(1);

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event) => {
        group.attr("transform", event.transform.toString());
        setZoomLevel(event.transform.k);
      });

    zoomBehaviorRef.current = behavior;
    svg.call(behavior);

    return () => {
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [data, isMobile]);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const hoveredInfo = hovered
    ? paths.find((item) => item.code === hovered) ?? null
    : null;
  const selectedInfo = selected
    ? paths.find((item) => item.code === selected) ?? null
    : null;
  const caption = hoveredInfo ?? selectedInfo;

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(zoomBehaviorRef.current.scaleBy, factor);
  }

  function resetZoom() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
  }

  function selectCountry(code: string) {
    onSelect(code === selected ? null : code);
    if (expanded) setExpanded(false);
  }

  const zoomLabel = zoomLevel.toFixed(1).replace(".", ",");

  if (error) {
    return (
      <div className="flex aspect-[2/1] items-center justify-center border border-line bg-paper-raised text-[10px] uppercase tracking-[0.16em] text-faint">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex aspect-[2/1] items-center justify-center border border-line bg-paper-raised text-[10px] uppercase tracking-[0.16em] text-faint">
        Carregando mapa…
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex flex-col bg-paper px-4 py-4 sm:px-6 lg:px-8"
          : ""
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          {caption ? (
            <>
              <span className="text-ink">{caption.name}</span>
              {" — "}
              {caption.count} {caption.count === 1 ? "notícia" : "notícias"}
            </>
          ) : (
            "Passe o cursor ou toque em um país"
          )}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
            Zoom {zoomLabel}×
          </span>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {expanded ? "Fechar" : "Expandir"}
          </button>
        </div>
      </div>

      <div className={expanded ? "relative min-h-0 flex-1" : "relative"}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={
            expanded
              ? "h-full w-full touch-none cursor-grab active:cursor-grabbing"
              : "mt-2 w-full touch-none cursor-grab active:cursor-grabbing"
          }
          role="img"
          aria-label="Mapa-múndi com volume de notícias por país"
        >
          <g ref={groupRef}>
            {paths.map((item) => {
              const interactive = Boolean(item.code) && item.count > 0;
              const isSelected = Boolean(item.code) && item.code === selected;
              const isHovered = Boolean(item.code) && item.code === hovered;

              return (
                <path
                  key={item.key}
                  d={item.d}
                  fill={heatColor(item.count, heat)}
                  stroke={
                    isSelected
                      ? selectedStroke
                      : isHovered
                        ? hoverStroke
                        : borderStroke
                  }
                  strokeWidth={isSelected ? 1.6 : isHovered ? 1 : 0.5}
                  className={
                    interactive
                      ? "cursor-pointer transition-opacity hover:opacity-80"
                      : undefined
                  }
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={
                    interactive
                      ? `${item.name}: ${item.count} notícias`
                      : undefined
                  }
                  aria-pressed={interactive ? isSelected : undefined}
                  onMouseEnter={() => {
                    if (item.code) setHovered(item.code);
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onPointerDown={(event) => {
                    pointerRef.current = {
                      x: event.clientX,
                      y: event.clientY,
                      moved: false,
                    };
                  }}
                  onPointerMove={(event) => {
                    const pointer = pointerRef.current;
                    if (!pointer) return;
                    if (
                      Math.abs(event.clientX - pointer.x) +
                        Math.abs(event.clientY - pointer.y) >
                      6
                    ) {
                      pointer.moved = true;
                    }
                  }}
                  onPointerUp={() => {
                    const pointer = pointerRef.current;
                    pointerRef.current = null;
                    if (!pointer || pointer.moved) return;
                    if (!interactive || !item.code) return;
                    selectCountry(item.code);
                  }}
                  onKeyDown={(event) => {
                    if (!interactive || !item.code) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectCountry(item.code);
                    }
                  }}
                >
                  <title>{`${item.name}: ${item.count}`}</title>
                </path>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-2 top-2 z-10 flex flex-col divide-y divide-line border border-line bg-paper/95 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => zoomBy(1.5)}
            disabled={zoomLevel >= MAX_ZOOM - 0.01}
            aria-label="Aproximar o mapa"
            className="grid h-8 w-8 place-items-center text-ink transition hover:bg-paper-raised disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.5)}
            disabled={zoomLevel <= 1.01}
            aria-label="Afastar o mapa"
            className="grid h-8 w-8 place-items-center text-ink transition hover:bg-paper-raised disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={zoomLevel <= 1.01}
            aria-label="Redefinir o zoom"
            className="grid h-8 w-8 place-items-center text-ink transition hover:bg-paper-raised disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em] text-faint">
        <span>Menos</span>
        <div className="flex items-center gap-1">
          {heat.map((color) => (
            <span
              key={color}
              className="h-2 w-6"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>Mais</span>
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-faint">
        Roda ou pinça para zoom · arraste para mover
      </p>
    </div>
  );
}
