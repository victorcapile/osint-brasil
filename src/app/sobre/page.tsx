import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Sobre — Radar OSINT",
  description:
    "Sobre o Radar OSINT: agregador de fontes abertas para a inteligência brasileira. Projeto independente de Victor Capile.",
};

const SECTIONS = [
  { id: "o-que-e", label: "O que é" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "dados", label: "Dados e privacidade" },
  { id: "stack", label: "Stack" },
  { id: "quem-fez", label: "Quem fez" },
];

const LINKS = [
  { label: "GitHub", href: "https://github.com/victorcapile" },
  { label: "Código-fonte", href: "https://github.com/victorcapile/osint-brasil" },
  { label: "Site", href: "https://osintbrasil.vercel.app" },
];

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

      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <section className="border-b border-line pb-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-accent">
            Sobre
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end">
            <h1 className="max-w-3xl font-serif text-[38px] leading-[1.06] tracking-tight text-ink sm:text-[48px] lg:text-[56px]">
              Um radar de fontes abertas para o Brasil.
            </h1>
            <p className="max-w-md text-[16px] leading-relaxed text-muted lg:pb-1">
              O Radar OSINT reúne notícias de veículos brasileiros e
              internacionais, organiza o fluxo por região, continente e gênero e
              destaca o que tem maior valor para a inteligência de Estado.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-[10px] uppercase tracking-[0.14em] text-faint">
            <span>Projeto independente</span>
            <span>Fontes abertas</span>
            <span>Sem login</span>
            <span>Versão 0.1 · 2026</span>
          </div>
        </section>

        <div className="mt-10 grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden md:sticky md:top-10 md:block md:self-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
                Ficha
              </p>
              <dl className="mt-3 space-y-2 text-[12px] leading-relaxed">
                <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-faint">Projeto</dt>
                  <dd className="text-right text-ink-soft">Independente</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-faint">Cobertura</dt>
                  <dd className="text-right text-ink-soft">48 fontes RSS</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-faint">Retenção</dt>
                  <dd className="text-right text-ink-soft">30 dias</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-faint">Versão</dt>
                  <dd className="text-right text-ink-soft">0.1 · 2026</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-faint">Autor</dt>
                  <dd className="text-right">
                    <a
                      href="#quem-fez"
                      className="text-ink-soft underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
                    >
                      Victor Capile
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
                Nesta página
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-[12px] text-muted">
                {SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="transition hover:text-ink"
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
                Links
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <article className="mx-auto min-w-0 max-w-[760px] space-y-10 md:mx-0">
            <section id="o-que-e" className="scroll-mt-10">
              <h2 className="font-serif text-[24px] text-ink">O que é</h2>
              <div className="mt-4 space-y-4">
                <p className="text-[15px] leading-relaxed text-muted">
                  O Radar OSINT é um agregador de notícias de fontes abertas
                  voltado ao monitoramento editorial e estratégico. A proposta é
                  simples: em vez de um feed infinito, oferecer três formas
                  complementares de leitura — um mapa de cobertura por país, um
                  radar de temas sensíveis e um feed social para acompanhar o
                  fluxo no dia a dia.
                </p>
                <p className="text-[15px] leading-relaxed text-muted">
                  Cada notícia recebe um escopo (nacional ou internacional), um
                  continente, um gênero editorial e uma nota de relevância de 0
                  a 10, calculada a partir de eixos como Amazônia, Defesa,
                  Fronteiras, Energia, Segurança, Ciber e Política.
                </p>
              </div>
            </section>

            <section id="como-funciona" className="scroll-mt-10">
              <h2 className="font-serif text-[24px] text-ink">Como funciona</h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
                <li>
                  <strong className="font-medium text-ink">Coleta:</strong> 48
                  feeds RSS de veículos brasileiros e internacionais, de
                  espectros editoriais diversos, além de buscas temáticas do
                  Google News.
                </li>
                <li>
                  <strong className="font-medium text-ink">Classificação:</strong>{" "}
                  heurística por palavras-chave em português, inglês e espanhol,
                  com detecção de país, continente e gênero.
                </li>
                <li>
                  <strong className="font-medium text-ink">Mapa:</strong> base
                  Natural Earth 110m com projeção Mercator. Tem zoom, pan e tela
                  cheia.
                </li>
                <li>
                  <strong className="font-medium text-ink">Radar:</strong>{" "}
                  notícias com relevância ≥ 5,0, com destaque em 1/3 da largura
                  que alterna entre as três maiores notas, e eixos monitorados.
                </li>
                <li>
                  <strong className="font-medium text-ink">
                    Feed e favoritos:
                  </strong>{" "}
                  fluxo social em coluna única, com busca, filtros por região,
                  gênero e fonte, e uma lista de leitura para depois.
                </li>
                <li>
                  <strong className="font-medium text-ink">
                    Leitor interno:
                  </strong>{" "}
                  o texto principal da matéria é extraído e sanitizado; quando o
                  veículo bloqueia o acesso, o resumo do feed é exibido e o link
                  original continua disponível.
                </li>
              </ul>
            </section>

            <section id="dados" className="scroll-mt-10">
              <h2 className="font-serif text-[24px] text-ink">
                Dados e privacidade
              </h2>
              <div className="mt-4 space-y-4">
                <p className="text-[15px] leading-relaxed text-muted">
                  As notícias pertencem aos veículos originais e cada item
                  mantém o link para a fonte. O app armazena os dados de
                  organização (título, resumo, classificação, link e favoritos)
                  em um Postgres na nuvem. O acervo e os favoritos têm retenção
                  de 30 dias.
                </p>
                <p className="text-[15px] leading-relaxed text-muted">
                  Não há login. O site é público e não usa os dados de navegação
                  para publicidade. A classificação é heurística e pode cometer
                  erros de contexto; ela não substitui uma análise humana.
                </p>
              </div>
            </section>

            <section id="stack" className="scroll-mt-10">
              <h2 className="font-serif text-[24px] text-ink">Stack</h2>
              <p className="mt-4 text-[14px] leading-relaxed text-muted">
                Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
                · PostgreSQL (Neon) · d3-geo/d3-zoom · Readability · Vercel.
              </p>
            </section>

            <section
              id="quem-fez"
              className="scroll-mt-10 border-t border-line pt-8"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
                Quem fez
              </p>
              <h2 className="mt-2 font-serif text-[30px] tracking-tight text-ink">
                Victor Capile
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Idealização e desenvolvimento do projeto. Projeto independente,
                sem vínculo institucional.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.16em]">
                {LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </section>
          </article>
        </div>

        <footer className="mt-16 flex flex-col gap-3 border-t border-line pt-6 text-[11px] leading-relaxed text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Radar OSINT · Projeto independente · 2026</p>
          <Link href="/" className="transition hover:text-ink">
            Voltar ao Radar
          </Link>
        </footer>
      </main>
    </div>
  );
}
