# mazetick

**Time-stamped market data for UK and Irish horse racing** — a record of what
could be known at each hour of the day, and the measurements behind it.

Racing Post, Sporting Life and At The Races already publish the racecard, the
form and the prices, free and better than we would. What none of them publishes
is *how any of it moved through the day*: which each-way terms a bookmaker was
advertising at 10:00 and again at 14:00, how wide the book was, whether the
going changed after the 04:00 declaration. Those facts exist only if somebody
records them continuously, and once the day is over they cannot be recovered.

**We publish measurements, not tips.** We do not sell selections and we do not
promise a return — because we spent two years trying to beat these markets with
machine learning and with classic handicapping rules, measured it honestly, and
neither worked. Those failures are published rather than buried, with their
sample sizes. A site that tells you a bet winning 78.8% of the time still loses
money has no reason to flatter the next number it shows you.

This repository is the website: a static Astro site, deployed to Cloudflare
Pages. The research that feeds it lives in
[horsing-maze](https://github.com/bumasello/horsing-maze), kept **separate on
purpose** — no key, no secret and no database access belongs here.

### What is worth stealing from this repo

Two things, if you build anything that publishes numbers:

- **`src/content.config.ts`** makes sample size, window, method and measurement
  date *required* fields. An article whose sample is not declared does not
  compile.
- **`scripts/verify.mjs`** runs inside `npm run build` and fails the build. Ten
  checks, governed by two rules learned the hard way — see
  [Verificação](#verificação).

---

*O restante deste README está em português, que é a língua de trabalho do
projeto. O site é em inglês britânico.*

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
5. **`PUBLIC_CF_BEACON_TOKEN`** com o token de *Web Analytics*, nas variáveis
   de **BUILD** (ao lado de `NODE_VERSION`) — **não** nas de runtime.

   ⚠️ **A distinção não é óbvia e erra em silêncio.** Num site estático não há
   execução por requisição, então variável de runtime não faz absolutamente
   nada: o valor precisa entrar no HTML no momento em que ele é gerado. Posta
   no lugar errado (ou esquecida), o trecho do beacon não renderiza, o site
   sobe bonito e fica **sem analytics sem avisar ninguém** — e é o analytics
   que torna apuráveis os critérios de morte do projeto, que estão escritos em
   sessões por mês.

   A **checagem 13** existe por isso: quando `WORKERS_CI=1` (que a Cloudflare
   injeta sozinha nos builds dela) e o beacon não está em todas as páginas, o
   build falha. Localmente a ausência é o esperado e não é erro.

   Trocar o Web Analytics para **snippet manual**, não injeção automática: a
   injeção reescreve o HTML na borda, então o que o leitor recebe deixa de ser
   o que o verify conferiu — mesma classe do incidente do adaptador — e
   colidiria com a CSP.
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

## Verificação

`npm run build` roda `scripts/verify.mjs` no fim e **falha com exit 1** se algo
quebrar. Nove checagens:

| checagem | por quê |
|---|---|
| sem Betfair/BSP no HTML | regra 2 — nenhum preço deles vira campo na tela |
| espaçamento em volta de `<a>` inline | o compilador apara a quebra de linha em vez de virar espaço, e o texto gruda |
| `data-density="full"` no HTML servido | é o estado que o Google indexa |
| `lang="en-GB"` | o site é britânico |
| canônica sem `.html` | tem de casar com o sitemap |
| canônicas ⊆ sitemap | senão a página compete consigo mesma no índice |
| links internos | nenhum 404 |
| sem script externo além do beacon | e o beacon está declarado na política |
| sem literal de cor no fonte | os tokens são a única fonte |
| sem cor fora dos tokens no artefato servido | cor pode nascer no build, fora do fonte |
| sem adaptador de servidor; saída em `dist/` | a Cloudflare já tentou instalar um sozinha |
| cabeçalhos presentes e CSP cobrindo os scripts | política fora de sincronia falha calada |
| beacon de analytics no build de produção | variável de build esquecida some sem avisar |
| sem sintaxe de template; JSON-LD parseável | olhar o arquivo não é interpretá-lo |
| derivação versionada e resolvível | número sem script commitado não vai ao ar |
| sem campo proibido nos JSON de dados | rede embaixo da regra 2, o dado vem de outro repo |
| todo JSON tem `generated_at` parseável | sem ele a página não mostra idade, e a regra 4 cai calada |
| sitemap ↔ páginas em correspondência 1:1 | artigo segurado deixaria 404 no Search Console |

Duas regras governam este arquivo:

**1. Toda checagem varre TODAS as páginas geradas, nunca uma amostra e nunca
uma região.** A lista manual anterior checava "links do rodapé: nenhum 404" e
passava — os `href` estavam certos, e o que quebrou foi o texto ao redor deles.
E a inspeção do artigo varreu só o `<main>`, deixando de fora o rodapé, que está
em toda página. Escopo de verificação é onde este projeto mais escorrega.

**1b. Ler o arquivo não é interpretá-lo.** Uma checagem que confirma que um
trecho *existe* não diz que ele é válido. O JSON-LD do site esteve quebrado nas
12 páginas com o bloco presente no HTML — dentro de um atributo, escapado, e
invisível na tela. Checagem sobre conteúdo estruturado tem de **parsear**, e tem
de verificar a intenção ("existe dado estruturado e ele é legível"), não a
ausência de um erro específico já conhecido.

**2. Um verificador que nunca falhou não foi verificado.** Ao acrescentar uma
checagem, quebre de propósito o que ela deve pegar, confirme que o build falha,
restaure, confirme que passa. E confira o código de saída: um script que imprime
"FALHOU" e devolve 0 é decoração.

```bash
npm run build; echo "exit: $?"   # tem de ser 1 quando algo quebra
```

## Dados: instantâneo, e falhar alto

`npm run build` começa por `scripts/fetch-data.mjs`, que baixa os JSON de
`bumasello/mazetick-data` (`extra-places.json` e `movers.json`). **Se o download falhar, o build falha** — sem deploy
novo, a versão anterior continua no ar. É o comportamento certo: degradar para
"sem corridas hoje" MENTE, e num portal cuja tese é "todo número carrega o
instante em que era verdade" essa é a pior mentira disponível.

Por isso `src/data/*.json` é **gitignored**: uma cópia velha commitada poderia
ser usada em silêncio num build sem rede, que é exatamente a falha que o script
existe para impedir. Ele também valida schema, `generated_at` e forma na porta
de entrada.

### Hora local, não UTC

Corrida em UK/IRE se cita em **hora local**. Os JSON trazem `off_utc` em UTC de
verdade, e exibi-lo deixaria todo horário uma hora errado no verão britânico —
errado de um jeito que parece certo, que é o pior tipo. `src/lib/time.ts`
converte para `Europe/London`, que cobre os dois países. **Carimbo de coleta
continua em UTC e vai rotulado**, porque é um fato sobre nós, não sobre a corrida.

### Os três estados vazios

Confundi-los é o erro fácil, e o terceiro é o perigoso:

1. **Sem corrida UK/IRE na coleta** — a página diz isso, com o carimbo.
2. **Ainda não coletamos hoje** — parece o caso 1; só o carimbo distingue, e a
   página não afirma qual é, porque não sabe.
3. **Dado velho porque a coleta quebrou** — parece o caso 1 e *mentiria*. A
   idade sai de `generated_at`, está **sempre visível**, e degrada em dois
   passos: acima de 8h vira aviso, acima de 24h vira faixa invertida dizendo
   que o dado está desatualizado.

⚠️ A idade relativa é calculada **no navegador**, de propósito. A página é
estática: calculada no build, "há 2 horas" congelaria e estaria mentindo seis
horas depois. O carimbo **absoluto** vai no HTML e está sempre correto — é ele
que o leitor sem JavaScript vê e o que o Google indexa.

## A regra da derivação

**Nenhum número vai para o site sem que o script que o produziu esteja
commitado.** Cada artigo declara `derivation: "caminho/script.py@commit"` no
frontmatter, apontando para o repositório
[horsing-maze](https://github.com/bumasello/horsing-maze) — e o commit é o que
produziu o número **publicado**, não o topo do arquivo hoje.

A regra nasceu de dois números publicados em dois dias sem derivação
versionada. **Os dois não reproduziram.** O campo é obrigatório no schema, o
`MethodBox` o mostra como link para o arquivo fixado no commit (o repositório é
público, então o leitor confere em vez de confiar), e a checagem 15 resolve
`git cat-file -e <commit>:<caminho>` quando o repositório do laboratório está
ao lado — provando que aquele arquivo existia naquele commit. Em build de CI o
repositório não está presente; a checagem confere só o formato e **imprime que
pulou**, porque pular calado seria o mesmo erro de sempre.

## Cabeçalhos e CSP

`dist/_headers` é **gerado** por `scripts/headers.mjs`, não escrito à mão, e
`npm run build` o encadeia antes do verify. O motivo é a CSP: ela usa **hash de
cada script inline**, e hash escrito à mão sai de sincronia no primeiro edit —
quando sai, ou bloqueia o script que devia rodar, ou alguém "resolve" pondo
`'unsafe-inline'`, que é a CSP deixando de proteger do que ela existe para
impedir.

A política é restritiva porque a superfície é mínima: um único script externo
(o beacon do Cloudflare Web Analytics, que a checagem 8 sustenta), CSS e fontes
na própria origem, nenhum formulário, nenhum iframe, nenhum handler `on*`.

⚠️ **`inlineStylesheets: 'never'` no `astro.config.mjs` é o que mantém
`style-src 'self'` possível.** O padrão (`'auto'`) inlineia folhas pequenas no
HTML e obrigaria a CSP a aceitar estilo inline. Não mudar sem mudar a CSP junto.

A checagem 12 confere que cada `<script>` inline servido tem o seu hash na
política, usando a **mesma função** que gerou o arquivo — importada, não
reimplementada, porque duas implementações divergiriam em silêncio.

Cache: `/_astro/*` leva `immutable` (nome com hash de conteúdo, imutável por
construção); o HTML **não**, senão uma correção publicada levaria um ano para
chegar a quem já visitou.

## Artigos segurados

`draft: true` no frontmatter tira o artigo do índice **e não gera a rota** —
nada é publicado. O cabeçalho do arquivo tem de dizer por que está segurado e o
que precisa acontecer para sair.

Hoje: `cost-of-crossing-the-spread.md`, medido em um dia só, aguardando
remedição contra os 26 dias já coletados.

Visual (precisa de `libasound2` no WSL):
`npx playwright install chromium && sudo npx playwright install-deps`

## Licence

The code in this repository is licensed under the MIT Licence
(see `LICENSE`).

The written content — the articles under `src/content/`, together with the
measurements and figures they report — is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). You are free to
share and adapt it, including commercially, provided you credit mazetick.com
and link back.
