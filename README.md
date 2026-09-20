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
Workers. The research that feeds it lives in
[horsing-maze](https://github.com/bumasello/horsing-maze), kept **separate on
purpose** — no key, no secret and no database access belongs here.

### What is worth stealing from this repo

Two things, if you build anything that publishes numbers:

- **`src/content.config.ts`** makes sample size, window, method and measurement
  date *required* fields. An article whose sample is not declared does not
  compile.
- **`scripts/verify.mjs`** runs inside `npm run build` and fails the build.
  Thirty checks, governed by two rules learned the hard way — see
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
4. **Nada de dado inventado.** Falta dado? A página diz que falta, com o
   carimbo da última coleta — e distingue os três estados vazios (abaixo). Não
   há componente genérico para isso de propósito: um `EmptyState` de catálogo
   chegou a existir, sem nenhuma página o usar, e um componente que ninguém usa
   mente sobre o que o site faz. Foi removido.

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

### A grade editorial — um eixo só, em toda página

Duas colunas. O que atravessa a largura inteira (manchete, régua de seção,
tabela de dado, rodapé) fica no nível da página; o que se lê fica em
`.spread > .body`; e `.spread > .rail` carrega o que distingue este site — o
carimbo de hora, o tamanho de amostra, o índice de seções.

**A largura da margem (`--rail`) é FIXA**, então a largura do corpo é a mesma em
toda página, com margem cheia ou vazia. É esse o ponto: o defeito que a grade
corrige não era "o texto está à esquerda", era o EIXO mudar de página para
página — em `/about` a manchete ocupava 1068px e o corpo 544px, e os dois não
partilhavam coluna nenhuma. Onde não há o que pôr na margem, ela não desenha
nada (`.rail:empty`) e o corpo não se move.

`.on-axis` amarra uma legenda de tabela larga à mesma coluna, em vez de a deixar
inventar uma medida própria.

### A alavanca de tema — três estados, e o terceiro é o que costuma faltar

Substituiu a de densidade, que foi removida em 2026-09-19: os dois estados quase
não diferiam e o controle custava mais atenção do que devolvia.

| estado | raiz | efeito |
|---|---|---|
| Auto | sem `data-theme` | vale `prefers-color-scheme` |
| Light | `data-theme="light"` | claro, mesmo com o sistema em escuro |
| Dark | `data-theme="dark"` | escuro |

Sem o "Auto" explícito não há como VOLTAR a seguir o sistema depois de escolher
uma vez. O HTML servido sai **sem `data-theme`** — é o que o Google indexa e o
que o leitor sem JavaScript recebe —, e um script inline no `<head>` aplica a
escolha **antes da primeira pintura**. A preferência nunca chega ao servidor.

⚠️ O script inline exige hash na CSP. Ele é calculado pelo `headers.mjs` a
partir do HTML CONSTRUÍDO, nunca escrito à mão, e a checagem 12 recusa o build
se algum script servido ficar sem hash.

## ⚠️ Com a Cloudflare, o que não está declarado no repositório ela decide

Quatro vezes numa semana, e o padrão é sempre o mesmo: **o que o leitor recebe
deixa de ser o que o `verify.mjs` conferiu.**

| o que ela decidiu | efeito | onde se diz não |
|---|---|---|
| injetar `@astrojs/cloudflare` no build | virou SSR, saída em `dist/client/`, 137 links quebrados | `wrangler.jsonc` + checagem 11 |
| reescrever o HTML na borda para o Web Analytics | HTML servido ≠ HTML verificado, e colide com a CSP | snippet manual + checagem 8 |
| reativar `*.workers.dev` a cada deploy | dois hostnames servindo o mesmo site | `wrangler.jsonc`: `workers_dev: false` |
| prefixar um `robots.txt` gerenciado | bloqueia 9 crawlers de IA e declara `ai-train=no` | ⛔ **não dá pelo repositório** |

O `wrangler.jsonc` cobre os três primeiros. **O quarto não**: o `robots.txt`
gerenciado é setting de ZONA, só pelo painel, e a Cloudflare o **prefixa** ao
nosso (doc: *bots/additional-configurations/managed-robots-txt*). Caminho para
desligar: **Security Settings → Bot traffic filter**, ou *Overview → Control AI
Crawlers → Display Content Signals Policy*.

⚠️ E ele contradiz a nossa própria licença: o conteúdo está sob **CC BY 4.0**,
que permite adaptar inclusive comercialmente, enquanto o bloco gerenciado diz
`ai-train=no` e barra ClaudeBot, GPTBot, CCBot, Google-Extended e outros. As
duas coisas apontam em direções opostas, e ninguém decidiu a segunda. É decisão
de produto, não de infraestrutura — mas tem de ser decisão, e não default.

*(`search=yes` é preservado, então o rastreamento normal do Google e o sitemap
não são afetados.)*

## Deploy — Cloudflare Workers

⚠️ **Workers, não Pages.** A Cloudflare migrou o produto; o que temos é um
Worker de assets, e é por isso que existe `wrangler.jsonc`, que a variável de CI
se chama `WORKERS_CI` e que `workers_dev`/`preview_urls` precisam ser
desligados. Quem procurar "Pages" no painel vai se confundir.

**Por que não Vercel:** o plano Hobby proíbe uso comercial, e a lista de
exemplos em `vercel.com/docs/limits/fair-use-guidelines` nomeia literalmente
*"Affiliate linking is the primary purpose of the site"* e *"The inclusion of
advertisements, including but not limited to online advertising platforms like
Google AdSense"* — os dois planos de receita deste site. A Cloudflare não tem
essa cláusula, e dá banda ilimitada, domínio e SSL de graça.

Passos (exigem a conta do dono — **não foram executados**):

1. Criar o repositório no GitHub e dar push.
2. Cloudflare → *Workers & Pages* → *Create* → *Import a repository*.
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
├── components/           # MethodBox, DataAge, StatFigure, RailIndex, ThemeToggle…
├── lib/                  # canonical.ts (a canônica, uma implementação só), time.ts,
│                         # horses.ts (o acervo), horse-copy.mjs (as frases dos
│                         # três estados — .mjs porque o verify.mjs as importa)
├── layouts/              # BaseLayout (canônica, JSON-LD, densidade), ArticleLayout
└── pages/
```

## Verificação

`npm run build` roda `scripts/verify.mjs` no fim e **falha com exit 1** se algo
quebrar. Vinte e três checagens:

| checagem | por quê |
|---|---|
| sem Betfair/BSP no HTML | regra 2 — nenhum preço deles vira campo na tela |
| espaçamento em volta de `<a>` inline | o compilador apara a quebra de linha em vez de virar espaço, e o texto gruda |
| tema não fixado no HTML, e aplicado antes da pintura | `data-theme` no artefato forçaria um tema para todo mundo; o aplicador fora do `<head>` dá lampejo do tema errado |
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
| sem sintaxe de template; JSON-LD parseável **e coerente com a canônica** | olhar não é interpretar, e parsear não é conferir |
| derivação versionada e resolvível | número sem script commitado não vai ao ar |
| sem campo proibido nos JSON de dados (em `src/data` **e em `dist/`**) | rede embaixo da regra 6, o dado vem de outro repo |
| todo JSON carimbado, **cada um com o carimbo do seu contrato** | sem carimbo a idade na tela vira a da derivação, e a regra 4 cai calada. O carimbo NÃO é o mesmo em todo arquivo: `collected_through` é relógio de coletor contínuo, que o acervo de cavalos não tem — lá o limite é `history_through`. O contrato mora em `scripts/data-contract.mjs` e é lido pelo verify E pelo fetch |
| sitemap ↔ páginas em correspondência 1:1 | artigo segurado deixaria 404 no Search Console |
| nenhuma coluna rotulada pelo relógio do leitor | "now" numa página estática é falso em algum momento do dia |
| página de dado completa no HTML servido | é o HTML que o Google indexa; corte tem de ser do cliente |
| `[hidden]` vence no CSS servido | sem o `!important`, no celular o filtro não esconderia nada |
| índice da margem coerente com os títulos da página | índice à mão sai de sincronia em silêncio: âncora morta não dá erro em lugar nenhum |
| tema escuro cobre todos os tokens, e os dois caminhos concordam | token esquecido no escuro não quebra nada — só fica ilegível numa página que ninguém abriu naquele tema |
| acervo, índice e páginas de cavalo em correspondência 1:1 | o acervo cresce ~600/dia e nenhuma lista é escrita à mão: registro sem página é link para 404, página sem registro é conteúdo que o produtor já não reconhece |
| cada estado com a sua palavra, e sem a do outro | `debut` afirma algo SOBRE O CAVALO, `no_record` confessa algo SOBRE NÓS. Trocar as duas foi o defeito que segurou a `/horse`, e errava por ~4× |
| toda página de cavalo declara até quando o arquivo vai | "career: 83 runs" sem dizer até quando mente por omissão |
| nenhuma taxa publicada sem a amostra na mesma linha | "23.5% on good" sem o `runs = 17` é o número que alguém usaria para apostar |
| título e descrição por cavalo distintos de verdade | páginas de cavalo aos milhares de uma vez; gabarito com o nome trocado é como se erra isso |
| toda faixa de distância publicada com a fronteira que a define | "27% em staying" é ilegível sem saber o que é staying; e a chave tem de existir em `distance_bands`, senão uma faixa nova aparece sem definição |
| a idade da COLETA aparece em toda página de dado | a 17 exige o campo no arquivo; a distância entre as duas é por onde a regra 4 cai calada |

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
`bumasello/mazetick-data`. São **dois caminhos de download**, e a diferença tem
motivo:

- `extra-places.json` e `movers.json` vêm por um GET cada;
- o acervo de cavalos vem pelo **tarball do repositório** (`scripts/untar.mjs`,
  leitor de tar sem dependência, porque um binário de sistema é mais uma coisa
  que a Cloudflare decidiria por nós). O índice e os registros por cavalo TÊM de
  vir do mesmo commit: baixados um a um, um push no meio da rodada daria um
  índice de uma versão e registros de outra, e a página sairia com um cavalo
  listado e sem página. É também um pedido de rede em vez de 679.

**Se o download falhar, o build falha** — sem deploy
novo, a versão anterior continua no ar. É o comportamento certo: degradar para
"sem corridas hoje" MENTE, e num portal cuja tese é "todo número carrega o
instante em que era verdade" essa é a pior mentira disponível.

**`bumasello/mazetick-data` é público por decisão, não por descuido:** a
máquina de build da Cloudflare precisa buscá-lo sem credencial, e o conteúdo é
derivado nosso — o recorte que remove as colunas do fornecedor acontece na
origem, no `build_site_data.py`, e não aqui. A checagem 16 é a rede embaixo
disso, não a política.

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
   idade sai de **`collected_through`**, está **sempre visível**, e degrada em
   dois passos: acima de 8h vira aviso, acima de 24h vira faixa invertida
   dizendo que o dado está desatualizado.

⚠️ **`collected_through` e `generated_at` são relógios diferentes, e trocá-los
apaga exatamente a distinção acima.** `generated_at` é quando NÓS derivamos;
`collected_through` é quando o COLETOR leu pela última vez. Um rebuild às 18:00
sobre uma coleta parada às 09:00 tem `generated_at` fresquíssimo e dado velho —
mostrar `generated_at` como idade faria o caso 3 se disfarçar de caso 1. Os dois
aparecem na tela; o rotulado `derived` é o secundário, e existe para o leitor
poder conferir contra o repositório de dados.

**Um quarto estado, o pior:** `collected_through` pode vir `null` de forma
legítima — é o produtor dizendo que não achou arquivo do coletor hoje. A página
então **não finge frescor**: declara, no HTML e sem depender de JavaScript, que
não tem como dizer quão velho o dado é. A CHAVE, essa, não pode sumir: a
checagem 17 e o `fetch-data.mjs` recusam um arquivo sem ela, porque aí a página
voltaria calada a exibir a derivação como se fosse coleta.

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

A checagem 12 confere que cada `<script>` inline **executável** servido tem o
seu hash na política, usando a **mesma função** que gerou o arquivo — importada,
não reimplementada, porque duas implementações divergiriam em silêncio.

⚠️ **"Executável" passou a importar em 2026-09-19, e o motivo é aritmético.** A
versão anterior hasheava também os blocos `application/ld+json`. Com 15 páginas
isso custava 10 hashes; com a `/horse` no ar são 694 páginas, cada uma com o seu
`Dataset`, e o cabeçalho ia a **37.561 bytes** — muito acima dos 8 a 16 KB que
uma borda aceita. A política simplesmente não seria servida, e site sem CSP é
pior que CSP que não cobre um bloco que o navegador nem executa. O medo que
justificava incluí-los também estava errado no mecanismo: a CSP impede a
EXECUÇÃO de um script inline, não a presença dele no DOM, e JSON-LD é lido do
DOM, nunca executado. A isenção é uma **lista de permissão de um item**
(`NON_EXECUTABLE_TYPES`), e a checagem 12 confere que qualquer outro tipo
continua exigindo hash — mais um **orçamento de 4 KB** para o cabeçalho, que é o
que impede a regressão silenciosa num site que cresce ~600 páginas por dia.

Cache: `/_astro/*` leva `immutable` (nome com hash de conteúdo, imutável por
construção); o HTML **não**, senão uma correção publicada levaria um ano para
chegar a quem já visitou.

## Artigos segurados

`draft: true` no frontmatter tira o artigo do índice **e não gera a rota** —
nada é publicado. O cabeçalho do arquivo tem de dizer por que está segurado e o
que precisa acontecer para sair.

Hoje: **nenhum**. Os cinco artigos publicam. (`cost-of-crossing-the-spread.md`
esteve segurado por estar medido em um dia só; foi remedido sobre 26 dias,
reescrito e publicado.)

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
