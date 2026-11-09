# RADAR OSINT

Agregador OSINT de notícias em português, feito para monitorar fontes abertas com foco nos
interesses da inteligência brasileira.

O painel coleta feeds RSS de veículos nacionais e internacionais, classifica cada notícia por
**escopo** (nacional/internacional), **continente** e **gênero**, e calcula uma **relevância
estratégica** para destacar temas sensíveis no modo **Radar**.

> MVP local: roda em `localhost`, sem chave de API e sem dependência de serviços pagos.

---

## Rodar

Requisitos: Node.js 22+ (recomendado 24/25) e npm.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Na primeira carga, o banco está vazio e o próprio painel dispara a coleta inicial (pode levar
até ~30 segundos). Depois disso, use o botão **Atualizar** para buscar novas notícias.

Para zerar os dados coletados, pare o servidor e apague `data/news.db` (ou a pasta `data/`).
Na próxima abertura, a base é recriada automaticamente.

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Sobe o painel em desenvolvimento (Turbopack). |
| `npm run build` | Build de produção. |
| `npm start` | Serve o build de produção. |
| `npm run ingest` | Coleta os feeds pelo terminal, sem abrir o site. |
| `npm run tune -- "termo"` | Mostra por que uma notícia recebeu cada gênero (calibração). |

---

## O que já funciona

- **36 fontes RSS** brasileiras e internacionais, mais buscas temáticas do Google News.
- Coleta paralela com timeout, deduplicação por link e por título, janela de 30 dias.
- Persistência local em **SQLite** (`data/news.db`), com atualização incremental.
- Classificação heurística em português, inglês e espanhol.
- **Filtros** por país, escopo, continente, gênero e relevância mínima.
- **Busca sem acentos** (ex.: `amazonia` encontra “Amazônia”).
- Ordenação por mais recentes ou mais relevantes.
- Três modos de leitura: **Mapa** (heatmap por país), **Radar** (notícias estratégicas) e
  **Feed** (fluxo social em coluna única).
- **Favoritos** por notícia, persistidos no SQLite e agrupados na aba **Favoritos** do Feed
  para ler depois. Artigos e favoritos têm retenção de **30 dias**.
- **Leitura interna**: cada notícia abre em `/noticia/<id>`, com extração Readability e
  fallback para o resumo quando o veículo bloqueia o acesso.
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
src/lib/db.ts        → SQLite (artigos, índices e metadados)
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
base **Natural Earth 110m** (`public/geo/countries.geojson`) com projeção **Equal Earth**
(equal-area) e pinta cada país conforme o volume de notícias.

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
    db.ts                   # SQLite
    types.ts                # tipos e metadados de UI
    format.ts               # datas/números
    text.ts                 # normalização de texto
public/
  geo/countries.geojson     # geometrias do mapa
scripts/
  ingest.ts                 # coleta via CLI
  tune-classify.ts          # diagnóstico de classificação
data/
  news.db                   # gerado automaticamente (ignorado no git)
```

---

## Limitações e próximos passos

- A classificação é **heurística**: simples, offline e rápida, mas sujeita a erros de contexto.
  O próximo salto é usar um LLM para rotular e resumir, mantendo a heurística como fallback.
- O painel carrega até 150 notícias por vez (o total filtrado aparece no cabeçalho).
- A atualização é manual (botão ou CLI). Um cron/agendador pode chamar `POST /api/refresh`.
- Não há autenticação — adequado apenas para uso local.
- Ideias: GDELT/NewsAPI, alertas por tema, mapa de calor, exportação CSV/JSON, resumos com IA,
  detecção de duplicatas semânticas e deploy.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · SQLite (`node:sqlite`) ·
`rss-parser` · `lucide-react`
