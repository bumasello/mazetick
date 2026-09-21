/**
 * Gera dist/_headers depois do build.
 *
 * Por que gerado e não escrito à mão em public/: a CSP usa HASH de cada script
 * inline. Hash escrito à mão sai de sincronia no primeiro edit, e uma CSP fora
 * de sincronia falha em silêncio — ou bloqueia o script que devia rodar, ou
 * (pior) fica permissiva porque alguém pôs 'unsafe-inline' para destravar.
 *
 * A superfície aqui é pequena o bastante para a política ser restritiva de
 * verdade: um único script externo (o beacon do Cloudflare Web Analytics), CSS
 * e fontes na própria origem, nenhum formulário, nenhum iframe, nenhum handler
 * on* inline. `inlineStylesheets: 'never'` no astro.config é o que mantém
 * `style-src 'self'` possível.
 *
 * A checagem 12 do verify.mjs confere que todo script inline servido tem o seu
 * hash nesta política. Cabeçalho declarado e não servido é a mesma classe de
 * coisa que verificador que nunca falha.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = 'dist';
const BEACON = 'https://static.cloudflareinsights.com';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );

/**
 * Todo <script> inline (sem src), com os atributos da tag ao lado.
 * @returns {{ attrs: string, body: string, type: string }[]}
 */
export function inlineScripts(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const t = attrs.match(/\btype\s*=\s*"([^"]*)"/i);
    out.push({ attrs, body: m[2], type: (t ? t[1] : '').trim().toLowerCase() });
  }
  return out;
}

/**
 * Tipos de <script> que o navegador NÃO executa, e que por isso não precisam de
 * hash na CSP.
 *
 * ⚠️ ISTO MUDOU EM 2026-09-19, E O MOTIVO É ARITMÉTICO.
 *
 * A versão anterior hasheava TAMBÉM os blocos `application/ld+json`, com a
 * justificativa de que "a maioria dos navegadores não os submete a script-src,
 * mas a maioria não é garantia". Com 15 páginas isso custava 10 hashes. Com a
 * /horse no ar são 694 páginas, cada uma com o seu Dataset: **689 hashes, e o
 * cabeçalho Content-Security-Policy passa de 37 KB**. O limite prático de
 * cabeçalho de resposta é de 8 a 16 KB conforme a borda — ou seja, a política
 * deixaria de ser servida, e um site sem CSP nenhuma é estritamente pior do que
 * um site cuja CSP não cobre um bloco de dados.
 *
 * E o medo que justificava a inclusão estava errado no mecanismo: a CSP impede a
 * EXECUÇÃO de um script inline, não a presença dele no DOM. JSON-LD nunca é
 * executado — ele é lido do DOM por quem extrai dado estruturado. Bloqueado ou
 * não, o `textContent` continua lá. O hash não comprava SEO nenhum; só pesava.
 *
 * A lista é de PERMISSÃO e tem um item. Qualquer outro tipo — inclusive tipo
 * nenhum, que é JavaScript clássico — continua exigindo hash, e a checagem 12
 * recusa o build se faltar.
 */
export const NON_EXECUTABLE_TYPES = new Set(['application/ld+json']);

/** Só os scripts que o navegador de fato executa. São estes que a CSP cobre. */
export const executableInlineScripts = (html) =>
  inlineScripts(html).filter((s) => !NON_EXECUTABLE_TYPES.has(s.type));

export const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;

const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const hashes = [...new Set(pages.flatMap((f) => executableInlineScripts(fs.readFileSync(f, 'utf8')).map((s) => sha256(s.body))))].sort();

// Os blocos de JSON-LD NÃO entram na conta — ver NON_EXECUTABLE_TYPES acima
// para o porquê, que é medido e não opinado: com eles a política passava de
// 37 KB e deixava de caber num cabeçalho de resposta.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",       // não há formulário no site; contato é mailto
  "img-src 'self' data:",
  "style-src 'self'",         // possível porque nada de CSS é inlineado
  "font-src 'self'",
  `script-src 'self' ${hashes.join(' ')} ${BEACON}`,
  `connect-src 'self' ${BEACON} https://cloudflareinsights.com`,
  'upgrade-insecure-requests',
].join('; ');

const headers = `# GERADO POR scripts/headers.mjs — NÃO EDITAR À MÃO.
# Os hashes da CSP saem do HTML construído; editar aqui sai de sincronia no
# primeiro build. A checagem 12 do verify.mjs recusa o build se sair.

/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=()

# Nome com hash de conteúdo: o arquivo é imutável por construção. Sem esta
# regra a Cloudflare serve max-age=0, must-revalidate e todo visitante
# revalida sem necessidade. O HTML NÃO entra aqui — para ele max-age=0 é o
# certo, senão uma correção publicada demora a chegar ao leitor.
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`;

if (process.argv[1] && process.argv[1].endsWith('headers.mjs')) {
  fs.writeFileSync(path.join(DIST, '_headers'), headers);
  console.log(
    `_headers gerado — ${hashes.length} hashes de script executável, CSP de ${csp.length} bytes, ${pages.length} páginas varridas.`,
  );
}
