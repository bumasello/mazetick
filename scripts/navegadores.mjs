/**
 * O site nos três motores: Chromium, Firefox e WebKit (o do Safari).
 *
 * POR QUE EXISTE
 * Até 2026-10-06 o site só tinha sido visto em Chromium, em todas as revisões.
 * 74% das impressões de busca vêm de celular e o público é britânico, onde boa
 * parte do celular é iPhone — e o fórum começou a mandar leitor de verdade.
 * "Funciona no meu navegador" era a única evidência que havia.
 *
 * O QUE CONFERE, em cada página, motor e largura:
 *   · erro de console, exceção de página e pedido que falhou — é onde uma CSP
 *     que um motor interpreta diferente aparece;
 *   · rolagem lateral (documento mais largo que a janela);
 *   · se as fontes do site carregaram, e qual família o título de fato usa;
 *   · medidas de layout (título, primeira tabela, margem), para comparar
 *     ENTRE motores — o número sozinho não diz nada, a diferença diz;
 *   · o que depende de JavaScript: seletor de tema, busca de cavalo, filtro
 *     da letra.
 *
 * ⚠️ Roda contra o site NO AR por padrão, de propósito: os cabeçalhos (CSP,
 * cache, tipo) vêm da Cloudflare e um servidor local não os reproduz.
 *
 * COMO RODAR
 * O WebKit do Playwright é compilado contra bibliotecas do Ubuntu. Em máquina
 * que não as tem (o WSL Arch de dev), rodar na imagem oficial, sem sudo:
 *
 *   docker run --rm -v "$PWD/scripts:/s" -v "$PWD/saida:/out" -w /w \
 *     mcr.microsoft.com/playwright:v1.63.0-noble \
 *     sh -c 'npm i --silent playwright@1.63.0 && cp /s/navegadores.mjs . && node navegadores.mjs /out'
 *
 * Uso: node navegadores.mjs <dir-de-saida> [base-url]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const SAIDA = process.argv[2] || 'navegadores-saida';
const BASE = (process.argv[3] || 'https://mazetick.com').replace(/\/$/, '');
fs.mkdirSync(SAIDA, { recursive: true });

const MOTORES = { chromium, firefox, webkit };
const LARGURAS = { celular: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
const PAGINAS = [
  ['home', '/'],
  ['extra-places', '/extra-places'],
  ['edicao', '/extra-places/2026-09-28'],
  ['movers', '/movers'],
  ['edicao-movers', '/movers/2026-10-02'],
  ['horse', '/horse'],
  ['letra-s', '/horse/letter/s'],
  ['cavalo', '/horse/annaf'],
  ['research', '/research'],
  ['artigo', '/research/extra-place-value'],
  ['about', '/about'],
];
// Capturas só das que mais importam, para olhar com os próprios olhos.
const CAPTURAR = new Set(['home', 'extra-places', 'cavalo', 'artigo', 'horse']);

const medir = () => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const h1 = document.querySelector('h1');
  const tabela = document.querySelector('table');
  const rail = document.querySelector('.rail');
  const corpo = document.querySelector('.body');
  const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
  return {
    larguraDoc: document.documentElement.scrollWidth,
    larguraJanela: window.innerWidth,
    alturaDoc: document.documentElement.scrollHeight,
    fontes: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')).sort(),
    fontesFalharam: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family),
    familiaH1: cs(h1, 'fontFamily'),
    h1: h1 ? { w: Math.round(r(h1).width), h: Math.round(r(h1).height), tam: cs(h1, 'fontSize') } : null,
    tabela: tabela ? { w: Math.round(r(tabela).width), display: cs(tabela.querySelector('thead'), 'display') } : null,
    tabelas: document.querySelectorAll('table').length,
    // A margem fica AO LADO do corpo no desktop e ABAIXO no celular.
    railAoLado: rail && corpo ? r(rail).left >= r(corpo).right - 2 : null,
    fundo: cs(document.body, 'backgroundColor'),
    tinta: cs(document.body, 'color'),
    temaVisivel: (() => { const b = document.querySelector('[data-theme-bar]'); return b ? !b.hidden : null; })(),
    apenasJsEscondidos: document.querySelectorAll('[data-js-only][hidden]').length,
  };
};

const resultado = {};
for (const [motor, tipo] of Object.entries(MOTORES)) {
  let navegador;
  try {
    navegador = await tipo.launch();
  } catch (e) {
    resultado[motor] = { erro: String(e.message).split('\n')[0] };
    console.log(`${motor}: NÃO abriu — ${resultado[motor].erro}`);
    continue;
  }
  resultado[motor] = { versao: navegador.version(), paginas: {} };
  for (const [nomeL, viewport] of Object.entries(LARGURAS)) {
    const contexto = await navegador.newContext({ viewport, locale: 'en-GB' });
    for (const [nome, caminho] of PAGINAS) {
      const pagina = await contexto.newPage();
      const problemas = [];
      pagina.on('console', (m) => { if (m.type() === 'error') problemas.push(`console: ${m.text().slice(0, 200)}`); });
      pagina.on('pageerror', (e) => problemas.push(`exceção: ${String(e.message).slice(0, 200)}`));
      pagina.on('requestfailed', (q) => problemas.push(`pedido falhou: ${q.url().replace(BASE, '')} (${q.failure()?.errorText})`));
      pagina.on('response', (resp) => { if (resp.status() >= 400) problemas.push(`HTTP ${resp.status()}: ${resp.url().replace(BASE, '')}`); });
      const chave = `${nome}@${nomeL}`;
      try {
        const resp = await pagina.goto(BASE + caminho, { waitUntil: 'load', timeout: 45000 });
        await pagina.evaluate(() => document.fonts.ready);
        await pagina.waitForTimeout(400);
        const m = await pagina.evaluate(medir);
        m.status = resp.status();
        // CÓPIA, tirada antes da captura de tela. No WebKit a própria captura
        // injeta uma folha de estilo, a CSP a recusa, e o aviso entraria aqui
        // como se fosse defeito do site — apareceu exatamente nas cinco
        // páginas capturadas e em nenhuma outra.
        m.problemas = [...problemas];

        // --- o que depende de JavaScript ---
        if (nome === 'home') {
          const botao = pagina.locator('[data-theme-set="dark"]');
          if (await botao.count()) {
            await botao.click();
            await pagina.waitForTimeout(150);
            m.temaEscuro = await pagina.evaluate(() => ({
              atributo: document.documentElement.dataset.theme || null,
              fundo: getComputedStyle(document.body).backgroundColor,
            }));
            await pagina.locator('[data-theme-set="system"]').click();
          } else m.temaEscuro = 'sem botão';
        }
        if (nome === 'horse') {
          const campo = pagina.locator('#hz-find');
          m.buscaVisivel = (await campo.count()) > 0 && (await campo.isVisible());
          if (m.buscaVisivel) {
            await campo.fill('ann');
            await pagina.waitForTimeout(200);
            m.busca = await pagina.evaluate(() => ({
              resultados: document.querySelectorAll('[data-hz-results] li').length,
              frase: document.querySelector('[data-hz-find-count]')?.textContent?.slice(0, 80),
            }));
          }
        }
        if (nome === 'letra-s') {
          const linhas = () => pagina.evaluate(() =>
            [...document.querySelectorAll('[data-hz-table="letter"] tbody tr')].filter((tr) => !tr.hidden && tr.offsetParent !== null).length);
          m.filtroAntes = await linhas();
          const q = pagina.locator('#hz-q');
          if ((await q.count()) && (await q.isVisible())) {
            await q.fill('sea');
            await pagina.waitForTimeout(200);
            m.filtroDepois = await linhas();
          } else m.filtroDepois = 'sem campo';
        }

        if (CAPTURAR.has(nome)) {
          await pagina.evaluate(() => window.scrollTo(0, 0));
          await pagina.screenshot({ path: path.join(SAIDA, `${nome}-${nomeL}-${motor}.png`) });
        }
        resultado[motor].paginas[chave] = m;
      } catch (e) {
        resultado[motor].paginas[chave] = { erro: String(e.message).split('\n')[0], problemas };
      }
      await pagina.close();
    }
    await contexto.close();
  }
  await navegador.close();
  console.log(`${motor} ${resultado[motor].versao}: ${Object.keys(resultado[motor].paginas).length} páginas`);
}
fs.writeFileSync(path.join(SAIDA, 'navegadores.json'), JSON.stringify(resultado, null, 1));

// ------------------------------------------------------------ o relatório
// A referência é o Chromium, porque é o único motor em que o site já foi
// visto. O que se imprime é a DIFERENÇA dos outros dois contra ele.
const ref = resultado.chromium?.paginas || {};
let diferencas = 0;
const perto = (a, b, tol) => Math.abs(a - b) <= tol;
for (const [motor, r] of Object.entries(resultado)) {
  if (r.erro) continue;
  console.log(`\n=== ${motor} ${r.versao}`);
  for (const [chave, m] of Object.entries(r.paginas)) {
    const linhas = [];
    if (m.erro) linhas.push(`NÃO CARREGOU: ${m.erro}`);
    else {
      if (m.status !== 200) linhas.push(`HTTP ${m.status}`);
      for (const p of m.problemas) linhas.push(p);
      if (m.larguraDoc > m.larguraJanela + 1) linhas.push(`ROLAGEM LATERAL: documento ${m.larguraDoc}px numa janela de ${m.larguraJanela}px`);
      if (m.fontesFalharam.length) linhas.push(`fonte que falhou: ${m.fontesFalharam.join(', ')}`);
      if (!m.fontes.length) linhas.push('NENHUMA fonte do site carregou');
      if (m.temaVisivel === false) linhas.push('seletor de tema escondido (JS não rodou?)');
      if (m.temaEscuro && m.temaEscuro !== 'sem botão' && m.temaEscuro.atributo !== 'dark') linhas.push(`tema escuro não aplicou: ${JSON.stringify(m.temaEscuro)}`);
      if (m.buscaVisivel === false) linhas.push('busca de cavalo invisível');
      if (m.busca && !m.busca.resultados) linhas.push(`busca sem resultado: ${m.busca.frase}`);
      if (typeof m.filtroDepois === 'number' && !(m.filtroDepois < m.filtroAntes)) linhas.push(`filtro da letra não filtrou: ${m.filtroAntes} → ${m.filtroDepois}`);
      const c = ref[chave];
      if (motor !== 'chromium' && c && !c.erro) {
        if (String(m.fontes) !== String(c.fontes)) linhas.push(`fontes: ${m.fontes} (chromium: ${c.fontes})`);
        if (m.h1 && c.h1 && !perto(m.h1.h, c.h1.h, 6)) linhas.push(`título com ${m.h1.h}px de altura (chromium: ${c.h1.h}px)`);
        if (m.tabela && c.tabela && !perto(m.tabela.w, c.tabela.w, 4)) linhas.push(`1ª tabela com ${m.tabela.w}px (chromium: ${c.tabela.w}px)`);
        if (m.tabela && c.tabela && m.tabela.display !== c.tabela.display) linhas.push(`cabeçalho da tabela: ${m.tabela.display} (chromium: ${c.tabela.display})`);
        if (m.railAoLado !== c.railAoLado) linhas.push(`margem ao lado: ${m.railAoLado} (chromium: ${c.railAoLado})`);
        if (m.fundo !== c.fundo || m.tinta !== c.tinta) linhas.push(`cores: fundo ${m.fundo} tinta ${m.tinta} (chromium: ${c.fundo} / ${c.tinta})`);
        if (m.tabelas !== c.tabelas) linhas.push(`${m.tabelas} tabelas (chromium: ${c.tabelas})`);
        if (!perto(m.alturaDoc, c.alturaDoc, Math.max(60, c.alturaDoc * 0.03))) linhas.push(`página com ${m.alturaDoc}px de altura (chromium: ${c.alturaDoc}px)`);
        if (JSON.stringify(m.busca) !== JSON.stringify(c.busca)) linhas.push(`busca: ${JSON.stringify(m.busca)} (chromium: ${JSON.stringify(c.busca)})`);
        if (m.filtroDepois !== c.filtroDepois) linhas.push(`filtro: ${m.filtroAntes}→${m.filtroDepois} (chromium: ${c.filtroAntes}→${c.filtroDepois})`);
      }
    }
    diferencas += linhas.length;
    console.log(`  ${chave.padEnd(22)} ${linhas.length ? '' : 'ok'}`);
    for (const l of linhas) console.log(`      ⚠ ${l}`);
  }
}
console.log(`\n${diferencas} ponto(s) a olhar. Capturas e navegadores.json em ${SAIDA}/`);
