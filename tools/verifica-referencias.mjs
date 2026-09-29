#!/usr/bin/env node
/**
 * verifica-referencias.mjs — acusa caminhos .md citados no .claude que nao resolvem.
 *
 *   node tools/verifica-referencias.mjs                     verifica o .claude do repo
 *   node tools/verifica-referencias.mjs --strict            idem, exit 1 se houver quebra
 *   node tools/verifica-referencias.mjs --docs              + a documentacao do repo (nunca trava)
 *   node tools/verifica-referencias.mjs --out=~/.claude     verifica outra raiz
 *
 * Um caminho citado conta como resolvido se existir, com a caixa EXATA (Linux/macOS
 * diferenciam maiusculas), relativo a: pasta do proprio arquivo ou raiz da skill
 * (skills/<nome>/, que e o valor de ${CLAUDE_SKILL_DIR}). A raiz do .claude NAO conta.
 * Blocos de codigo sao ignorados: trazem caminhos de EXEMPLO de saida, nao referencias.
 * Referencias citadas so pelo nome, sem caminho, nao sao verificadas.
 *
 * `--docs` e uma SEGUNDA varredura, sobre `docsPaths` do config (a documentacao do repo, que
 * ninguem media: foi assim que a mudanca dos documentos para doc/backlog/ deixou 5 links
 * quebrados). Documento nao e catalogo: resolve a partir da pasta do proprio arquivo ou da raiz
 * do repo, e NUNCA trava — nem com --strict —, para nao parar o pipeline por causa de um link
 * de documento. Sai em secao propria do relatorio.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT, CFG, caminho } from './config.mjs';
import { mapaAceitas } from './reescreve-links.mjs';

const argOut = process.argv.find((a) => a.startsWith('--out='))?.slice(6).replace(/^~(?=$|[\\/])/, os.homedir());
const OUT = argOut ? path.resolve(ROOT, argOut) : caminho('outPath');
const STRICT = process.argv.includes('--strict');
const DOCS = process.argv.includes('--docs');
// 'references' entrou em 2026-09-17 (N6): os README do hub em references/HUB/ citam caminhos
// do hub e nenhum deles era medido.
const PASTAS = ['skills', 'commands', 'agents', 'rules', 'references'];

/**
 * Residual conhecido (`referenciasAceitas` no sync.config.json) nao trava; qualquer quebra nova
 * trava. Sem essa separacao o --strict so teria dois estados uteis — sempre vermelho, ou
 * desligado —, e uma quebra nova passaria despercebida no meio dos residuais.
 */
const ACEITAS = mapaAceitas(CFG);
const aceita = (arquivo, citado) => ACEITAS.get(arquivo)?.has(citado) ?? false;

const walk = (d, acc = []) => {
  if (!fs.existsSync(d)) return acc;
  if (fs.statSync(d).isFile()) { if (/\.md$/i.test(d)) acc.push(d); return acc; }
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (/\.md$/i.test(e.name)) acc.push(p);
  }
  return acc;
};

/** existsSync e case-insensitive no Windows; aqui cada segmento precisa bater exato. */
const existeExato = (abs, raiz) => {
  const partes = path.relative(raiz, abs).split(path.sep);
  if (partes[0] === '..') return fs.existsSync(abs);
  let atual = raiz;
  for (const p of partes) {
    if (!fs.existsSync(atual) || !fs.statSync(atual).isDirectory()) return false;
    if (!fs.readdirSync(atual).includes(p)) return false;
    atual = path.join(atual, p);
  }
  return true;
};

/**
 * Varre um conjunto de arquivos .md e devolve as quebras. `bases(arquivo)` diz de onde um
 * caminho citado pode resolver — e a unica diferenca real entre catalogo e documentacao.
 * `extra` acrescenta um padrao de citacao (na documentacao, o caminho nu a partir da raiz do
 * repo: 'doc/pendente/x.md', que no catalogo nao existe).
 */
function varrer({ arquivos, raiz, bases, extra = null, ignoraCodigoInline = false }) {
  const quebras = [];
  const caixa = [];
  const relRaiz = (f) => path.relative(raiz, f).split(path.sep).join('/');
  for (const f of arquivos) {
    let emCodigo = false;
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((linha, i) => {
      if (/^\s*```/.test(linha)) { emCodigo = !emCodigo; return; }
      if (emCodigo) return; // blocos de codigo trazem caminhos de EXEMPLO de saida
      const citados = new Set();
      for (const m of linha.matchAll(/\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/gi)) citados.add(m[1]);
      // Alvo de link markdown vale sempre; o resto da linha, na documentacao, pode estar dentro
      // de `codigo inline` — ali o caminho esta sendo CITADO como exemplo (a tabela da RN2, o
      // dossie que reproduz um link quebrado), nao linkado. Mesmo espirito do bloco de codigo.
      // So na documentacao: mudar a regra do catalogo mexeria nos residuais ja aceitos.
      const alvo = ignoraCodigoInline ? linha.replace(/`[^`]*`/g, '``') : linha;
      // ${CLAUDE_SKILL_DIR}/..., caminho que comeca com ./ ou ../, ou com skills/ ou references/
      for (const m of alvo.matchAll(/\$\{CLAUDE_SKILL_DIR\}\/([\w.\/-]+\.md)\b/gi)) citados.add('${CLAUDE_SKILL_DIR}/' + m[1]);
      for (const m of alvo.matchAll(/(?<![\w\/.}-])((?:\.{1,2}\/)+[\w.\/-]+\.md|(?:skills|references)\/[\w.\/-]+\.md)\b/gi)) citados.add(m[1]);
      if (extra) for (const m of alvo.matchAll(extra)) citados.add(m[1]);
      for (const c of citados) {
        if (/^(https?:|mailto:)/.test(c)) continue;
        const alvos = bases(f, c);
        if (alvos === null) { quebras.push({ arquivo: relRaiz(f), linha: i + 1, citado: c + '  (variavel fora de skills/)' }); continue; }
        if (alvos.some((a) => existeExato(a, raiz))) continue;
        // Windows resolve sem ligar para caixa; Linux/macOS nao. Aviso, nao quebra.
        if (alvos.some((a) => fs.existsSync(a))) caixa.push({ arquivo: relRaiz(f), linha: i + 1, citado: c });
        else quebras.push({ arquivo: relRaiz(f), linha: i + 1, citado: c });
      }
    });
  }
  return { quebras, caixa };
}

// ------------------------------------------------------------------ catalogo (.claude)

const { quebras, caixa } = varrer({
  arquivos: PASTAS.flatMap((p) => walk(path.join(OUT, p))),
  raiz: OUT,
  // Bases validas = as que o Claude consegue resolver em tempo de execucao: a pasta do
  // proprio arquivo e, dentro de skills/<nome>/, a raiz da skill. ${CLAUDE_SKILL_DIR} e
  // substituido pelo Claude Code pela raiz da skill. A raiz do .claude NAO conta: a partir
  // de um projeto qualquer o Claude nao sabe onde ela fica.
  bases: (f, c) => {
    const partes = path.relative(OUT, f).split(path.sep);
    const raizSkill = partes[0] === 'skills' ? path.join(OUT, 'skills', partes[1]) : null;
    if (c.startsWith('${CLAUDE_SKILL_DIR}/')) {
      return raizSkill ? [path.resolve(raizSkill, c.slice('${CLAUDE_SKILL_DIR}/'.length))] : null;
    }
    return [path.dirname(f), raizSkill].filter(Boolean).map((base) => path.resolve(base, c));
  },
});

// ------------------------------------------------------------------ documentacao do repo (--docs)

let doc = { quebras: [], caixa: [] };
const DOCS_ALVOS = (CFG.docsPaths || []).filter((p) => !p.startsWith('_'));
if (DOCS) {
  // Caminho nu a partir da raiz do repo ('doc/pendente/x.md'): forma mais comum na documentacao
  // e a que o padrao do catalogo nao pega. As raizes vem do disco, nao de uma lista fixa.
  const raizes = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== '.git')
    .map((e) => e.name.replace(/[.]/g, '\\$&'));
  const extra = raizes.length
    ? new RegExp('(?<![\\w/.-])((?:' + raizes.join('|') + ')/[\\w./-]+\\.md)\\b', 'gi')
    : null;
  doc = varrer({
    arquivos: DOCS_ALVOS.flatMap((p) => walk(path.resolve(ROOT, p))),
    raiz: ROOT,
    // Documento nao e skill: resolve da pasta dele (link relativo) ou da raiz do repo
    // (caminho nu, como a documentacao cita).
    bases: (f, c) => [path.dirname(f), ROOT].map((base) => path.resolve(base, c)),
    extra,
    ignoraCodigoInline: true,
  });
}

// ------------------------------------------------------------------ relatorio

const novas = quebras.filter((q) => !aceita(q.arquivo, q.citado));
const residuais = quebras.filter((q) => aceita(q.arquivo, q.citado));
const docNovas = doc.quebras.filter((q) => !aceita(q.arquivo, q.citado));

/**
 * Residual aceito que parou de acontecer: a entrada virou peso morto no config. Mesmo espirito do
 * CONFIG SEM EFEITO do sync — o sintoma de nao avisar e nao haver sintoma nenhum.
 *
 * Mas "nao aconteceu nesta varredura" tem duas causas bem diferentes, e so uma pede acao: se o
 * ARQUIVO que cita nem existe na raiz varrida — tipico do --out=~/.claude, onde a skill e de stack
 * fora do global —, a entrada continua valendo no repo e remove-la seria um erro. Essa vai para
 * uma secao propria, informativa. Sem a separacao, o relatorio do global pedia, toda vez, a
 * remocao de 6 entradas legitimas; relatorio com ruido cronico e o comeco de relatorio que
 * ninguem le.
 */
const obsoletas = [];
const foraDoEscopo = [];
const todas = [...quebras, ...doc.quebras];
for (const [arquivo, cits] of ACEITAS) {
  // OUT cobre o catalogo; ROOT, a documentacao do --docs, cujas entradas sao relativas ao repo.
  const existeNaRaiz = fs.existsSync(path.join(OUT, arquivo)) || fs.existsSync(path.join(ROOT, arquivo));
  for (const c of cits) {
    if (todas.some((q) => q.arquivo === arquivo && q.citado === c)) continue;
    (existeNaRaiz ? obsoletas : foraDoEscopo).push(arquivo + '  ->  ' + c);
  }
}

const porArquivo = {};
for (const q of novas) (porArquivo[q.arquivo] ??= []).push(q);
console.log('=========== verifica-referencias ===========');
console.log('raiz    : ' + OUT);
console.log('quebras : ' + novas.length + ' em ' + Object.keys(porArquivo).length + ' arquivos  (fora as aceitas)');
console.log('aceitas : ' + residuais.length + ' residuais conhecidos (referenciasAceitas no sync.config.json)');
console.log('avisos  : ' + caixa.length + ' so diferem em maiusculas (funcionam no Windows, quebram em Linux/macOS)');
for (const q of caixa) console.log('     ' + q.arquivo + ':' + q.linha + '  ' + q.citado);
for (const [a, qs] of Object.entries(porArquivo)) {
  console.log('\n  ' + a);
  for (const q of qs) console.log('     L' + q.linha + '  ' + q.citado);
}
if (DOCS) {
  const porDoc = {};
  for (const q of docNovas) (porDoc[q.arquivo] ??= []).push(q);
  // Secao propria e informativa: a documentacao nao trava o pipeline (decisao da Onda 2.4).
  console.log('\n--- DOCUMENTACAO (' + docNovas.length + ' quebras em ' + Object.keys(porDoc).length +
    ' arquivos, informativo — nao trava nem com --strict) ---');
  console.log('  alvos : ' + (DOCS_ALVOS.join(', ') || '(docsPaths vazio no config)'));
  for (const [a, qs] of Object.entries(porDoc)) {
    console.log('  ' + a);
    for (const q of qs) console.log('     L' + q.linha + '  ' + q.citado);
  }
  if (doc.caixa.length) {
    console.log('  so diferem em maiusculas: ' + doc.caixa.length);
    for (const q of doc.caixa) console.log('     ' + q.arquivo + ':' + q.linha + '  ' + q.citado);
  }
}
if (obsoletas.length) {
  console.log('\n--- RESIDUAL ACEITO QUE NAO ACONTECE MAIS (' + obsoletas.length + ') — remova de referenciasAceitas ---');
  for (const o of obsoletas) console.log('  ' + o);
}
if (foraDoEscopo.length) {
  console.log('\n--- RESIDUAL ACEITO FORA DESTA RAIZ (' + foraDoEscopo.length + ') — esperado, nao remova ---');
  console.log('  o arquivo que cita nao foi publicado aqui (stack fora do global); a entrada segue valendo no repo');
  for (const o of foraDoEscopo) console.log('  ' + o);
}
if (STRICT && novas.length) {
  console.log('\nAbortado: quebra de referencia nova. Corrija, ou registre em referenciasAceitas com o porque.');
  process.exit(1);
}
