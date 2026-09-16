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

/** "2026-09-15T13:30:00Z" → "Tue 15 Sep" (dia local da corrida). */
const DMY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
export const raceDate = (iso: string): string => DMY.format(new Date(iso));

/** Chave de agrupamento por dia de corrida, no fuso da corrida. */
const YMD = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const raceDay = (iso: string): string => YMD.format(new Date(iso));

/**
 * O deslocamento até a largada, em texto.
 *
 * ⚠️ É o único jeito honesto de nomear a segunda observação. "Now" nomeia um
 * instante que depende do relógio de quem lê: às 15:51 a página dizia "now"
 * sobre uma corrida que havia corrido às 14:30. "6 min before the off" é
 * verdade para sempre, e é verdade igual às 10h e às 23h.
 *
 * O coletor para de observar quando a corrida parte, então o último ponto de
 * cada corredor é sempre ANTES da largada — nunca "agora".
 */
export const beforeOff = (mins: number): string => {
  if (mins <= 0) return 'under 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};
