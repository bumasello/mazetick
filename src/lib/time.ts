/**
 * Hora de corrida em UK/IRE se cita em HORA LOCAL, não UTC.
 *
 * Os JSON trazem `off_utc` em UTC de verdade (13:30Z), mas o cartão, o
 * Smarkets e qualquer conversa sobre a corrida dizem 14:30. Exibir UTC deixaria
 * todo horário uma hora errado no verão britânico — e errado de um jeito que
 * parece certo, que é o pior tipo.
 *
 * `Europe/London` cobre GB e IE: a Irlanda usa o mesmo deslocamento (IST = BST)
 * o ano inteiro, então uma zona só serve para os dois países do arquivo.
 */
const HHMM = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "2026-09-14T13:30:00Z" → "14:30" (hora local da corrida). */
export const raceTime = (iso: string): string => HHMM.format(new Date(iso));

/** Sufixo do fuso no dia em questão: "BST" ou "GMT". */
export const raceZone = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName')?.value ?? 'UK time';
