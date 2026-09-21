/**
 * Leitor mínimo de tar, sem dependência.
 *
 * Por que não `tar` do sistema: o build roda na máquina da Cloudflare, e a
 * lição registrada no wrangler.jsonc é que **o que não estiver declarado no
 * repositório, a Cloudflare decide**. Um binário de sistema é exatamente isso.
 * `zlib` é do Node e o formato tar é 512 bytes de cabeçalho; ler aqui custa
 * menos que depender de um pressuposto.
 *
 * Por que tar e não 678 downloads: os registros por cavalo têm de vir TODOS DO
 * MESMO COMMIT do repositório de dados. Baixados um a um, um push no meio da
 * rodada produziria um índice de uma versão e registros de outra — e a página
 * sairia com um cavalo listado e sem página, ou o contrário, sem nada acusar.
 * O tarball é um instantâneo atômico, e é um pedido de rede em vez de 678.
 */
import zlib from 'node:zlib';

const BLOCK = 512;
const str = (buf, off, len) => {
  const end = buf.indexOf(0, off);
  const stop = end === -1 || end > off + len ? off + len : end;
  return buf.toString('utf8', off, stop);
};
const octal = (buf, off, len) => {
  const s = str(buf, off, len).trim();
  return s ? parseInt(s, 8) : 0;
};

/**
 * @param {Buffer} gz tarball comprimido
 * @returns {Map<string, Buffer>} caminho → conteúdo, só arquivos regulares
 */
export function untarGz(gz) {
  const buf = zlib.gunzipSync(gz);
  const out = new Map();
  let pos = 0;
  /** Nome vindo de cabeçalho estendido (pax 'x' ou GNU 'L'), válido só para a
   *  PRÓXIMA entrada. Sem isto, um slug longo o bastante para estourar os 100
   *  bytes do campo `name` entraria com o nome errado — silenciosamente. */
  let pendingName = null;

  while (pos + BLOCK <= buf.length) {
    const head = buf.subarray(pos, pos + BLOCK);
    // Dois blocos zerados terminam o arquivo; um bloco zerado solto é padding.
    if (head.every((b) => b === 0)) {
      pos += BLOCK;
      continue;
    }

    const size = octal(head, 124, 12);
    const type = String.fromCharCode(head[156]) || '0';
    const prefix = str(head, 345, 155);
    const rawName = str(head, 0, 100);
    const name = pendingName ?? (prefix ? `${prefix}/${rawName}` : rawName);

    const dataStart = pos + BLOCK;
    const dataEnd = dataStart + size;
    const body = buf.subarray(dataStart, dataEnd);
    pos = dataStart + Math.ceil(size / BLOCK) * BLOCK;

    if (type === 'x' || type === 'X') {
      // pax: registros "<len> path=<valor>\n"
      const m = body.toString('utf8').match(/\d+ path=([^\n]+)\n/);
      pendingName = m ? m[1] : null;
      continue;
    }
    if (type === 'L') {
      // GNU longname: o bloco inteiro é o nome da entrada seguinte.
      pendingName = body.toString('utf8').replace(/\0+$/, '');
      continue;
    }

    pendingName = null;
    if (type === '0' || type === '\0') out.set(name, Buffer.from(body));
  }

  return out;
}
