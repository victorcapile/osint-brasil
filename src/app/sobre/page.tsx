import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Sobre — Radar OSINT",
  description:
    "Sobre o Radar OSINT: agregador de fontes abertas para a inteligência brasileira. Projeto independente de Victor Capile.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="h-[3px] bg-ink" />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
          <Link
            href="/"
            className="font-serif text-[20px] tracking-tight text-ink"
          >
            Radar OSINT
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10 lg:px-8">
        <p className="text-[10px] uppercase tracking-[0.24em] text-accent">
          Sobre
        </p>
        <h1 className="mt-3 font-serif text-[38px] leading-[1.08] tracking-tight text-ink sm:text-[48px]">
          Um radar de fontes abertas para o Brasil.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-muted">
          O Radar OSINT reúne notícias de veículos brasileiros e internacionais,
          organiza o fluxo por região, continente e gênero e destaca o que tem
          maior valor para a inteligência de Estado.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-[10px] uppercase tracking-[0.14em] text-faint">
          <span>Projeto independente</span>
          <span>Fontes abertas</span>
          <span>Sem login</span>
          <span>Versão 0.1 · 2026</span>
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="font-serif text-[24px] text-ink">O que é</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            O Radar OSINT é um agregador de notícias de fontes abertas voltado ao
            monitoramento editorial e estratégico. A proposta é simples: em vez
            de um feed infinito, oferecer três formas complementares de leitura —
            um mapa de cobertura por país, um radar de temas sensíveis e um feed
            social para acompanhar o fluxo no dia a dia.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">
            Cada notícia recebe um escopo (nacional ou internacional), um
            continente, um gênero editorial e uma nota de relevância de 0 a 10,
            calculada a partir de eixos como Amazônia, Defesa, Fronteiras,
            Energia, Segurança, Ciber e Política.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-serif text-[24px] text-ink">Como funciona</h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-muted">
            <li>
              <strong className="font-medium text-ink">Coleta:</strong> 36 feeds
              RSS de veículos brasileiros e internacionais, além de buscas
              temáticas do Google News.
            </li>
            <li>
              <strong className="font-medium text-ink">Classificação:</strong>{" "}
              heurística por palavras-chave em português, inglês e espanhol, com
              detecção de país, continente e gênero.
            </li>
            <li>
              <strong className="font-medium text-ink">Mapa:</strong> base
              Natural Earth 110m com projeção Equal Earth no desktop e azimutal
              de área igual centrada no Brasil no mobile. Tem zoom, pan e tela
              cheia.
            </li>
            <li>
              <strong className="font-medium text-ink">Radar:</strong> notícias
              com relevância ≥ 5,0, com destaque principal e eixos monitorados.
            </li>
            <li>
              <strong className="font-medium text-ink">Feed e favoritos:</strong>{" "}
              fluxo social em coluna única, com busca, filtros por região,
              gênero e fonte, e uma lista de leitura para depois.
            </li>
            <li>
              <strong className="font-medium text-ink">Leitor interno:</strong>{" "}
              o texto principal da matéria é extraído e sanitizado; quando o
              veículo bloqueia o acesso, o resumo do feed é exibido e o link
              original continua disponível.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-serif text-[24px] text-ink">Dados e privacidade</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            As notícias pertencem aos veículos originais e cada item mantém o
            link para a fonte. O app armazena os dados de organização (título,
            resumo, classificação, link e favoritos) em um Postgres na nuvem. O
            acervo e os favoritos têm retenção de 30 dias.
          </p>
          <p className="text-[15px] leading-relaxed text-muted">
            Não há login. O site é público e não usa os dados de navegação para
            publicidade. A classificação é heurística e pode cometer erros de
            contexto; ela não substitui uma análise humana.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-serif text-[24px] text-ink">Stack</h2>
          <p className="text-[14px] leading-relaxed text-muted">
            Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
            PostgreSQL (Neon) · d3-geo/d3-zoom · Readability · Vercel.
          </p>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
            Quem fez
          </p>
          <h2 className="mt-2 font-serif text-[30px] tracking-tight text-ink">
            Victor Capile
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            Idealização e desenvolvimento do projeto. Projeto independente, sem
            vínculo institucional.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.16em]">
            <a
              href="https://github.com/victorcapile"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
            >
              GitHub
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/victorcapile/osint-brasil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
            >
              Código-fonte
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://osintbrasil.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
            >
              Site
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[11px] leading-relaxed text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Radar OSINT · Projeto independente · 2026</p>
          <Link href="/" className="transition hover:text-ink">
            Voltar ao Radar
          </Link>
        </footer>
      </main>
    </div>
  );
}
