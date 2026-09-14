/**
 * Baixa os JSON de dados antes do build.
 *
 * ⚠️ FALHA O BUILD se o download falhar, e isso é o comportamento correto: sem
 * deploy novo, a versão anterior continua no ar. A alternativa — degradar para
 * "sem corridas hoje" — MENTE para o leitor, e num portal cuja tese é "todo
 * número carrega o instante em que era verdade" essa mentira é a pior possível.
 *
 * Por isso também: o arquivo baixado é gitignored. Uma cópia velha commitada
 * poderia ser usada em silêncio num build sem rede, que é exatamente a falha
 * que este script existe para impedir.
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCES = [
  {
    name: 'extra-places',
    url: 'https://raw.githubusercontent.com/bumasello/mazetick-data/main/data/extra-places.json',
    schema: 'extra_places_v1',
    out: 'src/data/extra-places.json',
    listKey: 'races',
  },
  {
    name: 'movers',
    url: 'https://raw.githubusercontent.com/bumasello/mazetick-data/main/data/movers.json',
    schema: 'movers_v1',
    out: 'src/data/movers.json',
    listKey: 'runners',
  },
];

const TIMEOUT_MS = 20_000;

for (const src of SOURCES) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let body;
  try {
    const res = await fetch(src.url, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    body = await res.text();
  } catch (e) {
    console.error(`\n✗ ${src.name}: download falhou — ${e.message}`);
    console.error(`  ${src.url}`);
    console.error('  O build PARA aqui de propósito: sem deploy, a versão anterior segue no ar.');
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    console.error(`\n✗ ${src.name}: resposta não é JSON — ${e.message}`);
    process.exit(1);
  }

  // Validação de forma na porta de entrada. Um JSON que chega diferente do
  // contrato tem de parar aqui, não virar página com buraco.
  const problems = [];
  if (data.schema !== src.schema) problems.push(`schema "${data.schema}", esperado "${src.schema}"`);
  if (!data.generated_at || Number.isNaN(Date.parse(data.generated_at))) {
    problems.push(`generated_at ausente ou não parseável: ${JSON.stringify(data.generated_at)}`);
  }
  // `collected_through` é o instante da última leitura do COLETOR, e é dele que
  // sai a idade na tela. A chave tem de EXISTIR: null é uma resposta legítima
  // ("não havia arquivo do coletor hoje"), ausente é o produtor regredindo para
  // o contrato antigo — e aí a página voltaria a mostrar `generated_at` como se
  // fosse frescor, que é a confusão que este campo existe para desfazer.
  if (!('collected_through' in data)) {
    problems.push('collected_through ausente — contrato antigo?');
  } else if (data.collected_through !== null && Number.isNaN(Date.parse(data.collected_through))) {
    problems.push(`collected_through não parseável: ${JSON.stringify(data.collected_through)}`);
  }
  if (!Array.isArray(data[src.listKey])) problems.push(`${src.listKey} não é lista`);

  if (problems.length) {
    console.error(`\n✗ ${src.name}: contrato violado`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(src.out), { recursive: true });
  fs.writeFileSync(src.out, body);
  // A idade reportada aqui é a da COLETA, não a da derivação — o mesmo relógio
  // que a página mostra ao leitor. Um build fresco sobre coleta parada não pode
  // parecer saudável no log.
  const ageH = data.collected_through
    ? `${((Date.now() - Date.parse(data.collected_through)) / 3.6e6).toFixed(1)}h`
    : 'IDADE DESCONHECIDA';
  console.log(
    `✓ ${src.name}: ${data[src.listKey].length} ${src.listKey}, coletado até ${data.collected_through} (${ageH}), derivado ${data.generated_at}, ${(body.length / 1024).toFixed(0)}KB`,
  );
}
