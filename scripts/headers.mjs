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

/** Conteúdo de todo <script> inline (sem src), incluindo os de JSON-LD. */
export function inlineScripts(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[2]);
  return out;
}

export const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;

const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const hashes = [...new Set(pages.flatMap((f) => inlineScripts(fs.readFileSync(f, 'utf8')).map(sha256)))].sort();

// JSON-LD entra na conta de propósito. Navegador não executa script de tipo
// não-JS, e a maioria não o submete a script-src — mas "a maioria" não é
// garantia, e um bloco de dados estruturados bloqueado falharia calado,
// custando SEO sem avisar ninguém.
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
  console.log(`_headers gerado — ${hashes.length} hashes de script inline, ${pages.length} páginas varridas.`);
}
