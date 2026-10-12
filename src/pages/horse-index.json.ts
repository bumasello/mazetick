/**
 * O índice de nomes da busca da /horse, como ARQUIVO à parte.
 *
 * Até 11/10/2026 ele viajava dentro da porta da /horse, num
 * `<script type="application/json">`. Com 863 cavalos eram 37 KB comprimidos;
 * com 7.747 passou a 92 KB dos 111 KB da página, pagos por todo leitor, e a
 * maioria chega pelo cartão do dia e nunca digita um nome. Agora a porta não o
 * carrega, e o script da busca o pede na primeira vez que o campo é usado.
 *
 * É um arquivo estático gerado no build, não uma API: tem o mesmo conteúdo que
 * as páginas de letra já mostram em HTML (nome e data da última declaração).
 */
import type { APIRoute } from 'astro';
import { loadRecords, searchIndexOf } from '../lib/horses';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(searchIndexOf(loadRecords())), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
