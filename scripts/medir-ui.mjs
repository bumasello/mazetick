/**
 * Mede a PÁGINA CONSTRUÍDA: altura de bloco, vazio na margem, rolagem lateral.
 *
 * ⚠️ POR QUE MEDIR E NÃO OLHAR. A sessão de UI de 2026-09-29 começou de uma
 * queixa — "seção grande com um grande espaço vazio ao lado" — que só virou
 * trabalho depois de virar número: a grade de duas colunas tinha 751px e
 * continha só a ficha, com 347px de corpo. **404px de margem vazia**, e as
 * cinco seções de verdade corriam abaixo sem aparato nenhum.
 *
 * Nenhuma dessas medidas aparece lendo o código, e a captura de tela sozinha
 * não dá o número que decide se melhorou.
 *
 * Uso, com o dist servido em algum lugar:
 *   python3 -m http.server 4321 --directory dist &
 *   node scripts/medir-ui.mjs http://localhost:4321/horse/algum-cavalo.html
 */
import { chromium } from 'playwright';

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('uso: node scripts/medir-ui.mjs <url> [url...]');
  process.exit(1);
}

const navegador = await chromium.launch();
for (const url of urls) {
  for (const [largura, rotulo] of [[1440, 'desktop'], [768, 'tablet'], [390, 'celular']]) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: 1000 } });
    await pagina.goto(url, { waitUntil: 'networkidle' });
    const m = await pagina.evaluate(() => {
      const alt = (s) => {
        const e = document.querySelector(s);
        return e ? Math.round(e.getBoundingClientRect().height) : null;
      };
      const corpo = alt('.body');
      const margem = alt('.rail');
      return {
        corpo,
        margem,
        // O número que importa: quanto da margem fica sem nada ao lado.
        vazioNaMargem: corpo !== null && margem !== null ? Math.max(0, margem - corpo) : null,
        ficha: alt('.ident'),
        particulares: alt('.particulars'),
        doc: Math.round(document.body.scrollHeight),
        rolaLateral:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    console.log(`${url.split('/').pop().padEnd(24)} ${rotulo.padEnd(8)} ${JSON.stringify(m)}`);
    await pagina.close();
  }
}
await navegador.close();
