# RADAR OSINT

Agregador OSINT de notícias em português, feito para monitorar fontes abertas com foco nos
interesses da inteligência brasileira.

O painel coleta feeds RSS de veículos nacionais e internacionais, classifica cada notícia por
**escopo** (nacional/internacional), **continente** e **gênero**, e calcula uma **relevância
estratégica** para destacar temas sensíveis no modo **Radar**.

> Online em **Vercel + Neon Postgres**. O app não usa chaves de API de notícias.

---

## Rodar

Requisitos: Node.js 22+ (recomendado 24/25), npm e um Postgres acessível (Neon/Supabase).

```bash
cp .env.example .env.local
# edite DATABASE_URL com a string pooled do Neon/Supabase
npm install
npm run dev
```

Se o projeto já estiver ligado ao Vercel:

```bash
vercel env pull .env.local
npm run dev
```

Abra <http://localhost:3000>.

Na primeira carga, o schema é criado automaticamente e o painel dispara a coleta inicial
(pode levar até ~30 segundos). Depois disso, use **Atualizar** ou `npm run ingest`.

O banco fica no Postgres (Neon). Para zerar os dados, apague as tabelas no SQL Editor ou
recrie o banco; o schema é recriado na próxima consulta.

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Sobe o painel em desenvolvimento (Turbopack). |
| `npm run build` | Build de produção. |
| `npm start` | Serve o build de produção. |
| `npm run ingest` | Coleta os feeds pelo terminal, sem abrir o site. |
| `npm run tune -- "termo"` | Mostra por que uma notícia recebeu cada gênero (calibração). |

---

## Deploy

- Repositório: <https://github.com/victorcapile/osint-brasil>
- Vercel: projeto `osintbrasil` (conta `victor-8268`)
- Banco: **Neon** via Vercel Marketplace (`DATABASE_URL` em Production/Preview/Development)
- URL: <https://osintbrasil.vercel.app>

```bash
vercel --prod
```

O repositório está conectado ao projeto na Vercel: pushes em `main` disparam deploy automático.
O deploy manual também funciona com `vercel --prod`.

---

## O que já funciona

- **36 fontes RSS** brasileiras e internacionais, mais buscas temáticas do Google News.
- Coleta paralela com timeout, deduplicação por link e por título, janela de 30 dias.
- Persistência em **Postgres (Neon)**, com atualização incremental.
- Classificação heurística em português, inglês e espanhol.
- **Filtros** por país, escopo, continente, gênero, fonte e relevância mínima.
- **Busca sem acentos** (ex.: `amazonia` encontra “Amazônia”).
- Ordenação por mais recentes ou mais relevantes.
- Três modos de leitura: **Mapa** (heatmap por país), **Radar** (notícias estratégicas) e
  **Feed** (fluxo social em coluna única).
- **Favoritos** por notícia, persistidos no Postgres e agrupados na aba **Favoritos** do Feed
  para ler depois. Artigos e favoritos têm retenção de **30 dias**.
- **Leitura interna**: cada notícia abre em `/noticia/<id>`, com extração Readability e
  fallback para o resumo quando o veículo bloqueia o acesso.
- Página **Sobre** (`/sobre`) com metodologia, limites, privacidade e autoria, acessível
  pelo canto direito do menu e pelo rodapé.
- Interface editorial (papel e tinta), com tipografia serifada e controles discretos.

---

## Navegação: Mapa / Radar / Feed

O topo do painel tem três modos persistentes:

- **Mapa** — mapa-múndi com heatmap de volume por país. Tem **zoom por roda/pinça**, pan por
  arraste, controles de zoom e **modo tela cheia**. Clique em um país para ver o total, as
  últimas manchetes e abrir o leitor interno. O ranking de países complementa o mapa.
- **Radar** — notícias com relevância ≥ 5,0 para a inteligência de Estado, com um destaque
  principal, os eixos monitorados (Amazônia, Defesa, Fronteiras, Ciber etc.) e a lista
  ordenada por score.
- **Feed** — fluxo em coluna única no estilo rede social: avatar/fonte, `@handle`, data e
  hora, gênero, região, manchete, resumo e link para leitura. No topo do Feed, as abas
  **Fluxo** e **Favoritos** alternam entre o fluxo geral e a lista salva.

O modo ativo fica no hash da URL (`#mapa`, `#radar`, `#feed`) e o menu continua fixo ao rolar.

### Leitura interna

Ao clicar em uma notícia, o app abre `/noticia/<id>` em vez de mandar o usuário para fora.
A página mostra o snapshot editorial e tenta extrair o texto principal da matéria com
**Readability**; o HTML é sanitizado e guardado em cache por 30 dias. Se o veículo bloquear a
extração (paywall, 403, JavaScript obrigatório), a página exibe o resumo do feed e mantém o
link **“Ler no veículo original”**.

### Favoritos e retenção

O botão **Salvar** aparece nos cards do Feed, do Radar e do painel do país. O favorito guarda
um snapshot da notícia (título, link, fonte, data, classificação) em uma tabela própria no
SQLite; assim ele continua legível mesmo se o artigo original sair da janela de coleta.

- Artigos e favoritos são mantidos por **30 dias** e removidos automaticamente depois disso.
- O botão **Salvo** remove o favorito antes do prazo.
- A aba **Favoritos** do Feed agrupa a lista para leitura posterior.

---

## Como funciona

```
src/lib/sources.ts   → curadoria dos feeds
        ↓
src/lib/rss.ts       → coleta, limpeza e deduplicação
        ↓
src/lib/classify.ts  → geografia + gênero + relevância
        ↓
src/lib/db.ts        → Postgres/Neon (artigos, índices e metadados)
        ↓
src/app/api/*        → API de leitura e de atualização
        ↓
src/components/*     → painel (React/Tailwind)
```

### Classificação por região

1. O texto é normalizado (minúsculas, sem acentos, pontuação vira espaço).
2. Um mapa de países/gentílicos/regiões identifica o continente predominante.
3. Se o Brasil predomina, o escopo é **nacional**; caso contrário, **internacional**.
4. Quando nenhum país é identificado, usa-se o padrão da fonte (`defaultContinent`).

Continentes: Brasil, América do Sul, América do Norte, América Central e Caribe, Europa,
Oriente Médio, Ásia, África, Oceania e Global/Multirregional.

### Classificação por gênero

Cada gênero tem termos fortes (3 pontos) e fracos (1 ponto); a fonte também soma uma pista
inicial. Vence a maior pontuação.

Gêneros: **Geopolítica**, **Negócios**, **Ciência**, **Esportes**, **Segurança**,
**Tecnologia**, **Saúde** e **Geral**.

### Mapa de cobertura por país

Cada notícia recebe um **país** (código ISO alpha-2) quando o texto cita o país, um gentílico
ou a capital. Notícias nacionais sem menção explícita são atribuídas ao Brasil. O mapa usa a
base **Natural Earth 110m** (`public/geo/countries.geojson`). No desktop, a projeção é
**Equal Earth**; no mobile, um **azimutal de área igual centrado no Brasil** em formato
quadrado, para dar mais área útil e legibilidade. Cada país é pintado conforme o volume de
notícias.

O mapa tem zoom (roda do mouse ou pinça), pan por arraste e botão de tela cheia — útil
principalmente no mobile. Ao clicar em um país com notícias:

1. o fluxo abaixo é filtrado pelo país;
2. o painel mostra o total e as últimas manchetes;
3. clicar novamente no país (ou em “Limpar seleção”) remove o filtro.

Os países com mais notícias também aparecem em um ranking clicável ao lado do mapa.

### Relevância e Radar Brasil

A relevância (**0–10, com uma casa decimal**) é a soma ponderada de 11 eixos de interesse:

`Amazônia` · `Defesa` · `Fronteiras` · `Geopolítica` · `Energia` · `Economia` ·
`Segurança` · `Ciber` · `Ciência & Tech` · `Saúde` · `Política`

Notícias nacionais e fontes mais estratégicas recebem bônus. Artigos com score ≥ 5,0 entram no
**Radar Brasil**.

---

## Adicionar ou remover fontes

Edite `src/lib/sources.ts`:

```ts
{
  id: "minha-fonte",
  name: "Minha Fonte",
  url: "https://exemplo.com/rss.xml",
  defaultContinent: "brasil", // usado quando o texto não cita país
  genreHint: "negocios",      // apenas desempate
  lang: "pt",
  weight: 2,                  // 3 = fonte estratégica
}
```

Depois clique em **Atualizar** (ou rode `npm run ingest`). Feeds que respondem com HTML,
encoding antigo ou XML malformado são tratados com fallback e ficam visíveis nos erros da
coleta.

## Calibrar a classificação

As listas de palavras-chave ficam em `src/lib/classify.ts`. Para entender por que uma notícia
foi classificada de determinada forma, com o servidor rodando:

```bash
npm run tune -- "amazonia"
npm run tune -- "IPVA" cnn-brasil
```

O comando mostra a pontuação de cada gênero e os termos que casaram.

---

## Estrutura

```
src/
  app/
    api/articles/route.ts   # leitura filtrável + estatísticas
    api/favorites/route.ts  # listar/salvar/remover favoritos
    api/refresh/route.ts    # dispara a coleta
    noticia/[id]/page.tsx   # leitor interno (extração + fallback)
    noticia/[id]/loading.tsx
    sobre/page.tsx          # sobre o projeto, metodologia e autoria
    layout.tsx
    page.tsx
    globals.css
  components/
    Dashboard.tsx           # shell, menu de 3 modos e estado
    RadarView.tsx           # modo Radar
    MapView.tsx             # modo Mapa
    FeedView.tsx            # modo Feed (fluxo + favoritos)
    SocialPost.tsx          # post do feed social
    FavoriteButton.tsx      # botão Salvar/Salvo
    BackButton.tsx          # voltar no leitor
    ViewHeader.tsx          # cabeçalho editorial de cada modo
    WorldMap.tsx            # mapa + heatmap
    CountryPanel.tsx        # ranking e notícias do país
  lib/
    sources.ts              # feeds
    rss.ts                  # ingestão
    classify.ts             # heurísticas de gênero/relevância
    countries.ts            # detecção de país e continente
    country-data.ts         # base ISO/nomes (Natural Earth)
    readability.ts          # extração/sanitização do texto original
    db.ts                   # Postgres/Neon (cliente postgres)
    types.ts                # tipos e metadados de UI
    format.ts               # datas/números
    text.ts                 # normalização de texto
public/
  geo/countries.geojson     # geometrias do mapa
scripts/
  ingest.ts                 # coleta via CLI
  tune-classify.ts          # diagnóstico de classificação
  migrate-sqlite.ts         # migração única do SQLite local para o Postgres
data/
  news.db                   # opcional: só para a migração única (ignorado no git)
```

---

## Limitações e próximos passos

- A classificação é **heurística**: simples, offline e rápida, mas sujeita a erros de contexto.
  O próximo salto é usar um LLM para rotular e resumir, mantendo a heurística como fallback.
- O painel carrega até 150 notícias por vez (o total filtrado aparece no cabeçalho).
- A atualização é manual (botão ou CLI). Um cron/agendador pode chamar `POST /api/refresh`.
- Não há autenticação — quem tiver a URL pública na Vercel consegue acessar.
- Ideias: GDELT/NewsAPI, alertas por tema, exportação CSV/JSON, resumos com IA e detecção de
  duplicatas semânticas.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
PostgreSQL (Neon) · `postgres` · `rss-parser` · `d3-geo`/`d3-zoom` · `lucide-react` ·
Vercel
