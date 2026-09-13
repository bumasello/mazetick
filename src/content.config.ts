import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Regra 4 do site_handoff.md: "Todo número na tela carrega o instante em que era
 * verdade. Uma tabela sem 'as of HH:MM' não é o nosso produto, é o de todo mundo."
 *
 * Aqui essa regra deixa de ser boa intenção e vira condição de build: sem
 * `sample`, `window`, `method` e `measured`, o artigo não compila. Um artigo de
 * pesquisa cuja amostra não está declarada não deveria conseguir ser publicado,
 * e agora não consegue.
 */
const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.md' }),
  schema: z
    .object({
      title: z.string(),
      /** Subtítulo. Uma frase, o achado — não um teaser. */
      dek: z.string(),
      description: z.string().max(160),

      // --- O bloco de método. Obrigatório, sem excepção. ---
      /** ex.: "33,508 races · 6.5% commission applied" */
      sample: z.string(),
      /** A janela por extenso, para o bloco de método. ex.: "1 January 2024 – 5 September 2026" */
      window: z.string(),
      /** A mesma janela em forma escaneável, para a tabela do índice. */
      windowShort: z.string().max(26),
      /** Como foi medido, em uma frase legível. */
      method: z.string(),
      /** Data da medição, ISO. Alimenta o MethodBox E o JSON-LD. */
      measured: z.coerce.date(),

      published: z.coerce.date(),
      updated: z.coerce.date().optional(),

      /**
       * O que aconteceu com a AFIRMAÇÃO TESTADA, não com o nosso humor:
       *   negative      → a afirmação caiu (rótulo: "Refuted")
       *   positive      → sobreviveu ao teste (rótulo: "Held up")
       *   inconclusive  → a amostra não decide
       * O site publica refutação com amostra grande — é o conteúdo que ninguém
       * no nicho tem, e é o motivo para acreditar no resto das páginas.
       */
      verdict: z.enum(['negative', 'positive', 'inconclusive']),

      /** O que o número NÃO diz. Pelo menos um item; exigido, não sugerido. */
      limits: z.array(z.string()).min(1),

      order: z.number().default(99),
      draft: z.boolean().default(false),
    })
    .strict(),
});

export const collections = { research };
