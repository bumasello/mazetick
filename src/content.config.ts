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
      /** ex.: "1 Jan 2024 – 5 Sep 2026" */
      window: z.string(),
      /** Como foi medido, em uma frase legível. */
      method: z.string(),
      /** Data da medição, ISO. Alimenta o MethodBox E o JSON-LD. */
      measured: z.coerce.date(),

      published: z.coerce.date(),
      updated: z.coerce.date().optional(),

      /**
       * O veredicto em uma palavra. O site publica resultado negativo com
       * amostra grande — é o conteúdo que ninguém no nicho tem.
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
