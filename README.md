# mazetick.com

Portal de dados de turfe de UK/IRE. O produto é a **camada de mercado carimbada
no tempo** — o que se sabia a cada hora do dia.

Site estático (Astro), publicado no **Cloudflare Pages**. O repositório do
laboratório (modelos, coleta, sondas) é o `horsing-maze` e fica **separado deste
de propósito**: aqui não entra segredo, chave nem acesso a banco.

## Regras invioláveis

Estão em `horsing-maze/docs/site_handoff.md` §2. As duas que mais afetam código:

1. **Não publicar palpite nem prometer ROI.** O site publica medição, incluindo
   as que deram contra nós. É daí que vem a credibilidade do resto.
2. **Não publicar preço derivado da Betfair.** Exibir preço deles exige a *Odds
   Publisher Licence*, que exige ser afiliado, e o programa de UK/IRE fechou em
   01/07/2025. O BSP continua como insumo interno de pesquisa e **nunca vira
   campo na tela** — aparece só como metodologia ("settled at the exchange
   starting price") e em agregado derivado nosso. A camada de mercado exibida
   vem do **Smarkets**, cuja API é pública.

Mais duas que moldam os componentes:

3. **Todo número na tela carrega o instante em que era verdade.** Em artigo de
   pesquisa isso é o `MethodBox`, e o schema em `src/content.config.ts` torna
   `sample`, `window`, `method` e `measured` **obrigatórios**: sem eles o build
   falha. Um artigo sem amostra declarada não consegue ser publicado.
4. **Nada de dado inventado.** Falta dado? `EmptyState`, dizendo a hora da
   última coleta.

## Rodar

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/
npm run preview
```

## Design

Os tokens vêm de `horsing-maze/docs/design_tokens.md`, extraídos da direção
aprovada em 2026-09-13, e estão transcritos em `src/styles/tokens.css`.

**Nenhum componente escreve cor, tamanho ou espaçamento literal.** Se um valor
não está em `tokens.css`, ele não existe. Conferir com:

```bash
grep -rnE '#[0-9A-Fa-f]{3,8}\b' src/components src/layouts src/pages
```

⚠️ **Verde (`--accent`) não quer dizer "aposte aqui".** Quer dizer "difere do
padrão para cima". A página não recomenda nada.

### A alavanca de densidade

Um layout, dois estados. O HTML servido sai **sempre em `full`** — é o estado
que o Google indexa e o que o visitante novo vê. Um script inline lê
`localStorage['mazetick:density']` antes da pintura e só então troca, para quem
já escolheu. A preferência nunca chega ao servidor.

O toggle só renderiza onde morde. Numa página de prosa ele não aparece.

## Deploy — Cloudflare Pages

**Por que não Vercel:** o plano Hobby proíbe uso comercial, e a lista de
exemplos em `vercel.com/docs/limits/fair-use-guidelines` nomeia literalmente
*"Affiliate linking is the primary purpose of the site"* e *"The inclusion of
advertisements, including but not limited to online advertising platforms like
Google AdSense"* — os dois planos de receita deste site. Cloudflare Pages não
tem essa cláusula, e dá banda ilimitada, domínio e SSL de graça.

Passos (exigem a conta do dono — **não foram executados**):

1. Criar o repositório no GitHub e dar push.
2. Cloudflare Pages → *Create project* → *Connect to Git*.
3. Build command `npm run build`, output `dist`, Node 22.
4. Custom domain `mazetick.com` (+ `www`), e mover o DNS para a Cloudflare.
5. **Settings → Variables**: `PUBLIC_CF_BEACON_TOKEN` com o token de
   *Web Analytics*. Sem ela o beacon não renderiza — que é o comportamento
   correto em dev.
6. **Deploy hook**: guardar a URL. É por ela que a arquitetura por instantâneo
   vai rebuildar o site quando a coleta terminar, sem o site nunca consultar o
   laboratório ao vivo.

## Privacidade

`/privacy` e `/cookies` descrevem o site **como ele é**, não um texto padrão:
sem cookie, sem anúncio, sem afiliado, sem formulário; fontes self-hosted;
Cloudflare Web Analytics (cookieless); e uma chave de `localStorage` para a
densidade.

As duas páginas terminam com **"what would change this page"**, listando o que
obriga revisão *antes* de ir ao ar. **Ao acrescentar AdSense, link de afiliado,
formulário ou outro analytics, revisar as duas páginas no mesmo commit.**

## Estrutura

```
src/
├── content.config.ts     # schema Zod dos artigos — método obrigatório
├── content/research/     # os artigos, em Markdown
├── styles/tokens.css     # a única fonte de cor, tipo e espaçamento
├── components/           # o catálogo: MethodBox, DenseTable, EmptyState…
├── layouts/              # BaseLayout (canônica, JSON-LD, densidade), ArticleLayout
└── pages/
```

## Verificação antes de publicar

```bash
npm run build
grep -c 'data-density="full"' dist/*.html          # estado inicial indexável
grep -ho 'rel="canonical"[^>]*' dist/*.html        # sem .html, casa com o sitemap
grep -ri 'betfair' dist/                           # tem de dar VAZIO (regra 2)
```

Visual (precisa de `libasound2` no WSL):
`npx playwright install chromium && sudo npx playwright install-deps`
