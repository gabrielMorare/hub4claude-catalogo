#!/usr/bin/env node
/**
 * deploy-global.mjs — publica no escopo user-level (~/.claude) as stacks de trabalho do catalogo,
 * onde passam a valer para TODOS os projetos, sem copiar pasta em cada um.
 *
 *   node tools/deploy-global.mjs --stacks                   mostra as stacks dentro e fora do global
 *   node tools/deploy-global.mjs --stacks=java,angular      grava a escolha desta maquina (sync.local.json)
 *   node tools/deploy-global.mjs --stacks=padrao            apaga a escolha local: volta ao padrao
 *   node tools/deploy-global.mjs --com-claude-md --dry-run  mostra o que mudaria
 *   node tools/deploy-global.mjs --com-claude-md            aplica
 *
 * O .claude/ do repo tem TUDO do hub (RN0); aqui so passa o que pertence a uma stack de
 * `globalStacks` — a de tools/sync.local.json, se existir, senao a de sync.config.json. A stack
 * de cada arquivo vem de tools/catalogo-stacks.json, gravado pelo sync. Stack que sai da lista e
 * removida do global no proximo deploy. Nao le o hub: roda numa maquina sem ele.
 *
 * Espelha apenas as pastas que sao nossas (commands, agents, rules, references) — o
 * ~/.claude tambem guarda estado do proprio Claude Code (settings.json, projects/,
 * sessions/, plugins/...), que este script NUNCA toca.
 *
 * --com-claude-md gera o catalogo com as stacks EFETIVAS em ~/.claude/hub4claude/CLAUDE.md (enxuto:
 * so anuncia o que foi publicado; nao passa por arquivo versionado, D5) e poe no ~/.claude/CLAUDE.md
 * da pessoa so um bloco que o importa (D7). O resto do CLAUDE.md dela nao e tocado.
 *
 * Arquivo da pessoa com o mesmo caminho de um do catalogo, fora do manifesto e diferente, aborta
 * o deploy antes de escrever (D6): o ~/.claude nao e so nosso.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  ROOT, INDICE, GLOBAL_STACKS, ORIGEM_STACKS, LOCAL_PATH, stackDe, vaiParaGlobal, resumoStacks, stacksInexistentes,
} from './stacks.mjs';
import { CFG, CONFIG_ALTERNATIVO, CONFIG_PATH, caminho } from './config.mjs';
import { reescreverLinksQuebrados, mapaAceitas } from './reescreve-links.mjs';
import { textoGlobal } from './catalogo-md.mjs';

const SRC = caminho('outPath');

const DRY = process.argv.includes('--dry-run');
const COM_MD = process.argv.includes('--com-claude-md');
const SO_STACKS = process.argv.includes('--stacks');
const DEFINE_STACKS = process.argv.find((a) => a.startsWith('--stacks='))?.slice('--stacks='.length);
/**
 * Destino alternativo, exclusivo da suite: sem ele o deploy nao e testavel por comportamento,
 * porque o unico destino possivel seria o ~/.claude real. So vale junto de HUB4CLAUDE_CONFIG, e
 * em producao a variavel nunca esta setada — a guarda logo abaixo continua valendo por inteiro.
 */
const TEST_DST = process.argv.find((a) => a.startsWith('--test-dst='))?.slice('--test-dst='.length);
const DST = TEST_DST ? path.resolve(ROOT, TEST_DST) : path.join(os.homedir(), '.claude');

// Somente estas pastas sao espelhadas. Tudo o mais em ~/.claude fica intocado.
// 'commands' e 'references' seguem aqui DE PROPOSITO depois da migracao para skills/: e o que
// faz a limpeza do que ja foi publicado la rodar. Tirar da lista antes de ~/.claude estar limpo
// deixaria os arquivos antigos orfaos no global, fora do manifesto e intocaveis para sempre.
const ESPELHADAS = ['skills', 'commands', 'agents', 'rules', 'references'];

const walk = (d, base = d, acc = []) => {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return acc;
};

/** Mesma protecao do sync: conteudo listado em keepFiles nunca e removido. */
const protegido = (rp) => (CFG.keepFiles || [])
  .filter((k) => !k.startsWith('_'))
  .some((k) => rp === k || rp.startsWith(k.replace(/\/?$/, '/')));

// Todos os arquivos do .claude/ do repo nas pastas espelhadas, como 'commands/x.md'.
const todos = ESPELHADAS.flatMap((pasta) => walk(path.join(SRC, pasta)).map((r) => pasta + '/' + r));

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const origemDaLista = (origem) => (origem === 'local'
  ? 'local: ' + rel(LOCAL_PATH) + ' (so esta maquina; --stacks=padrao volta ao padrao)'
  : 'padrão: ' + rel(CONFIG_PATH) + ' (--stacks=<ids> escolhe so para esta maquina)');

const tabela = (lista = GLOBAL_STACKS, origem = ORIGEM_STACKS) => {
  console.log('\nStacks do catalogo — lista valendo: ' + origemDaLista(origem) + '\n');
  for (const s of resumoStacks(todos, lista)) {
    console.log('  ' + (s.noGlobal ? '[no global] ' : '[fora]      ') + s.id.padEnd(12) +
                String(s.arquivos).padStart(4) + ' arquivos   ' + s.nome);
  }
};

/**
 * A escolha de stacks desta maquina. Gravada por aqui, e nao a mao, para a validacao ser a mesma
 * de sempre: id inexistente aborta sem escrever. O arquivo fica fora do git (.gitignore).
 */
if (DEFINE_STACKS !== undefined) {
  if (DEFINE_STACKS === 'padrao') {
    if (fs.existsSync(LOCAL_PATH)) fs.rmSync(LOCAL_PATH);
    console.log('escolha local apagada: vale o padrao de ' + rel(CONFIG_PATH));
    tabela(CFG.globalStacks || [], 'padrão');
    process.exit(0);
  }
  const ids = [...new Set(DEFINE_STACKS.split(',').map((s) => s.trim()).filter(Boolean))];
  const ruins = stacksInexistentes(ids);
  if (!ids.length || ruins.length) {
    console.error('ERRO: ' + (ids.length ? 'stack inexistente: ' + ruins.join(', ') : 'lista vazia') +
      '. Nada gravado. Ids validos: ' + Object.keys(CFG.stacks || {}).join(', '));
    process.exit(1);
  }
  fs.writeFileSync(LOCAL_PATH, JSON.stringify({ globalStacks: ids }, null, 2) + '\n', 'utf8');
  console.log('escolha local gravada em ' + rel(LOCAL_PATH) + ': ' + ids.join(', '));
  tabela(ids, 'local');
  process.exit(0);
}

if (SO_STACKS) { tabela(); process.exit(0); }

// O destino e sempre o ~/.claude real. Config alternativo (HUB4CLAUDE_CONFIG) existe para testar
// num sandbox; deixar o deploy seguir com ele publicaria o catalogo de teste em todo projeto da
// maquina. Nem o --dry-run passa: a guarda nao pode depender de lembrarem da flag.
if (CONFIG_ALTERNATIVO && !TEST_DST) {
  console.error('ERRO: deploy-global nao roda com HUB4CLAUDE_CONFIG (' + CONFIG_PATH + ').\n' +
    'O destino e o ~/.claude real; so --stacks, que nao escreve nada, aceita config alternativo.');
  process.exit(1);
}
// O par tem de estar completo nos dois sentidos: destino de teste com o catalogo REAL publicaria
// a saida de um teste onde ela nao deveria estar, e o manifesto do destino real iria junto.
if (TEST_DST && !CONFIG_ALTERNATIVO) {
  console.error('ERRO: --test-dst so vale com HUB4CLAUDE_CONFIG — destino de teste exige catalogo de teste.');
  process.exit(1);
}

// Sem indice nao ha como saber a stack de nada: publicar seria tudo-ou-nada as cegas.
if (!fs.existsSync(INDICE)) {
  console.error('ERRO: ' + path.relative(ROOT, INDICE) + ' nao existe: o catalogo deste repo esta incompleto ' +
    '(quem o mantem gera o indice na conversao). Nada foi publicado.');
  process.exit(1);
}

// Arquivo sem stack nao pode ser decidido: abortar ANTES de escrever, nunca pular em silencio (RN4).
const semStack = todos.filter((rp) => !stackDe(rp));
if (semStack.length) {
  console.error('ERRO: ' + semStack.length + ' arquivo(s) do .claude/ sem stack — classifique em "stacks" ' +
    '(sync.config.json) ou rode o sync de novo. Nada foi publicado.');
  for (const rp of semStack) console.error('  ' + rp);
  process.exit(1);
}

/**
 * Manifesto do que o hub4claude publicou neste destino. So removemos no destino aquilo que
 * publicamos — nunca arquivos que a pessoa criou direto no ~/.claude.
 *
 * Mora NO DESTINO, e nao no clone do repo: o registro tem de acompanhar o ~/.claude. No clone, um
 * repo clonado de novo (ou a troca do repo do admin pela distribuicao) nao sabia o que ja era
 * nosso, e todo arquivo do catalogo que tivesse mudado virava "colisao com arquivo pessoal". E um
 * deploy para outro destino (sandbox, HOME falso) nao tem mais como apagar o registro deste.
 *
 * `manifestoPath` (tools/.deploy-global-manifest.json) e o lugar antigo: lido so para migrar,
 * quando o destino ainda nao tem manifesto e o antigo e deste destino.
 */
const MANIFESTO = path.join(DST, 'hub4claude', 'manifesto.json');
const lerJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const antigo = fs.existsSync(MANIFESTO) ? null : lerJson(caminho('manifestoPath'));
const migrado = Boolean(antigo && antigo.destino === DST);
const publicadoAntes = new Set((lerJson(MANIFESTO) || (migrado ? antigo : {})).arquivos || []);

const norm = (s) => s.replace(/\r\n/g, '\n');
let linksDesfeitos = 0;
const detalhe = { copiados: [], removidos: [], links: [] };
const preservados = [];
const foraDoGlobal = new Set(todos.filter((rp) => !vaiParaGlobal(rp)));

/**
 * O conjunto COMPLETO do que vai ser publicado, montado antes de escrever qualquer coisa. E por
 * ele que a reescrita de link decide (N13), e um arquivo de skills/ pode citar um de agents/:
 * decidir com a lista parcial da pasta da vez desfaria link cujo destino existe.
 */
const naOrigemPorPasta = new Map(ESPELHADAS.map((pasta) => [
  pasta,
  new Set(walk(path.join(SRC, pasta)).filter((r) => !foraDoGlobal.has(pasta + '/' + r))),
]));
const publicados = new Set(
  ESPELHADAS.flatMap((pasta) => [...naOrigemPorPasta.get(pasta)].map((r) => pasta + '/' + r))
);
const ACEITAS = mapaAceitas(CFG);

// ---------------------------------------------------------------- fase 1: o plano, sem escrever
// Tudo o que o deploy faria e decidido aqui; as guardas rodam sobre o plano inteiro e so depois
// algo e escrito. Uma guarda depois do laco de escrita e inerte (tools/README.md, Armadilhas).

/** { rp, a (origem; null = conteudo gerado), b (destino), conteudo (null = copia a origem), igual } */
const plano = [];
const remover = [];
for (const pasta of ESPELHADAS) {
  const src = path.join(SRC, pasta);
  const dst = path.join(DST, pasta);
  // Pasta de origem ausente NAO e motivo para pular: walk() devolve [] e a remocao segue. Pulando,
  // o que ja publicamos la ficaria orfao para sempre — e sairia do manifesto, virando intocavel.
  const naOrigem = naOrigemPorPasta.get(pasta);

  for (const r of naOrigem) {
    const a = path.join(src, r);
    const b = path.join(dst, r);
    const rp = pasta + '/' + r;
    // .md passa pela reescrita de link (N13); asset vai byte a byte, como sempre foi.
    let conteudo = null;
    if (/\.md$/i.test(r)) {
      const bruto = fs.readFileSync(a, 'utf8');
      const { texto, desfeitos } = reescreverLinksQuebrados(norm(bruto), {
        relArquivo: rp, publicados, aceitas: ACEITAS.get(rp),
      });
      if (desfeitos.length) {
        linksDesfeitos += desfeitos.length;
        for (const d of desfeitos) detalhe.links.push(rp + '  ->  ' + d);
        // Preserva o fim de linha da origem: escrever LF onde a origem tem CRLF faria a
        // comparacao ver diferenca onde nao ha, e o deploy recopiaria a cada execucao.
        conteudo = /\r\n/.test(bruto) ? texto.replace(/\n/g, '\r\n') : texto;
      }
    }
    // Normaliza CRLF na comparacao: com core.autocrlf do Git for Windows o destino pode
    // diferir so por fim de linha, o que faria todo deploy recopiar tudo, sempre.
    const igual = fs.existsSync(b) &&
      norm(conteudo ?? fs.readFileSync(a, 'utf8')) === norm(fs.readFileSync(b, 'utf8'));
    plano.push({ rp, a, b, conteudo, igual });
  }

  // Remove no destino o que nao deve mais estar la — so dentro das pastas espelhadas, e so o que
  // o proprio deploy publicou (manifesto). Duas razoes para sair: o arquivo sumiu do repo, ou a
  // stack dele saiu da lista. No segundo caso keepFiles NAO protege: tirar a stack da lista e um
  // pedido explicito de tira-la do global. Arquivo que a pessoa escreveu direto no ~/.claude
  // nunca esta no manifesto e nunca e removido.
  for (const r of walk(dst)) {
    if (naOrigem.has(r)) continue;
    const rp = pasta + '/' + r;
    if (!publicadoAntes.has(rp)) { preservados.push(rp); continue; }
    if (!foraDoGlobal.has(rp) && protegido(rp)) { preservados.push(rp); continue; }
    remover.push(rp);
    detalhe.removidos.push(rp + (foraDoGlobal.has(rp) ? '   (stack ' + stackDe(rp) + ' fora do global)' : ''));
  }
}

/**
 * O CLAUDE.md da pessoa e DELA (D7). O catalogo mora num arquivo nosso, hub4claude/CLAUDE.md, e o
 * dela ganha so um bloco curto que o importa (@caminho, relativo ao arquivo que importa; em
 * ~/.claude/CLAUDE.md carrega sem dialogo de aprovacao). A linha do import nao muda entre
 * deploys: o que muda (stacks, catalogo novo) fica no nosso arquivo, e o dela e escrito uma vez.
 */
const NOSSO_RP = 'hub4claude/CLAUDE.md';
const BLOCO = [
  '<!-- BEGIN hub4claude — gerado por tools/deploy-global.mjs. Não edite dentro deste bloco:',
  '     o deploy o reescreve. Para desinstalar, apague o bloco e a pasta ~/.claude/hub4claude/ -->',
  'Catálogo Foursys (skills, agentes e rules do hub4claude): @' + NOSSO_RP,
  '<!-- END hub4claude -->',
].join('\n');
// `antigo` e o formato dos deploys ate a Onda 3: o CLAUDE.md inteiro era o bloco gerado.
const MARCADORES = {
  hub4claude: ['<!-- BEGIN hub4claude', '<!-- END hub4claude -->'],
  antigo: ['<!-- BEGIN CATALOGO GERADO', '<!-- END CATALOGO GERADO -->'],
};

/** O que fazer com o CLAUDE.md da pessoa: { acao, texto } ou { erro }. Nao escreve. */
function planoClaudeMdPessoal(alvo) {
  if (!fs.existsSync(alvo)) return { acao: 'criar', texto: BLOCO + '\n' };
  const bruto = fs.readFileSync(alvo, 'utf8');
  const atual = norm(bruto).replace(/^﻿/, '');
  // Marcador sem par: nao da para saber onde o nosso trecho acaba. Adivinhar apagaria texto dela.
  for (const [nome, [ini, fim]] of Object.entries(MARCADORES)) {
    const i = atual.indexOf(ini), j = atual.indexOf(fim);
    if ((i === -1) !== (j === -1) || j < i) return { erro: 'marcador do bloco "' + nome + '" sem par (' + ini + ' ... ' + fim + ')' };
  }
  const troca = ([ini, fim]) => atual.slice(0, atual.indexOf(ini)) + BLOCO + atual.slice(atual.indexOf(fim) + fim.length);
  let texto, acao;
  if (atual.includes(MARCADORES.hub4claude[0])) {
    texto = troca(MARCADORES.hub4claude);
    acao = texto === atual ? 'intocado' : 'atualizar bloco';
  } else if (atual.includes(MARCADORES.antigo[0])) {
    texto = troca(MARCADORES.antigo);
    acao = 'migrar bloco antigo';
  } else {
    texto = (atual.trim() ? atual.replace(/\s*$/, '\n') + '\n' : '') + BLOCO + '\n';
    acao = 'acrescentar bloco';
  }
  if (/\r\n/.test(bruto)) texto = texto.replace(/\n/g, '\r\n');
  return { acao, texto };
}

let nosso = null, pessoal = null;
if (COM_MD) {
  // Gerado aqui, com as stacks efetivas, e nunca copiado de tools/CLAUDE.global.md: aquele reflete
  // o padrao versionado, e regenera-lo com a escolha local sujaria o git a cada deploy (D5).
  const b = path.join(DST, ...NOSSO_RP.split('/'));
  const conteudo = textoGlobal(GLOBAL_STACKS);
  nosso = { rp: NOSSO_RP, a: null, b, conteudo, existia: fs.existsSync(b) };
  nosso.igual = nosso.existia && norm(fs.readFileSync(b, 'utf8')) === conteudo;
  pessoal = { alvo: path.join(DST, 'CLAUDE.md'), ...planoClaudeMdPessoal(path.join(DST, 'CLAUDE.md')) };
}

// ---------------------------------------------------------------- guardas (antes de qualquer escrita)

/**
 * Colisao com arquivo pessoal (D6): existe no destino, nao esta no manifesto e o conteudo difere
 * do que seria publicado. Sobrescrever apagaria o trabalho da pessoa — e passaria a registra-lo
 * como nosso, alcancavel por uma remocao futura. Igual byte a byte e adotado, como sempre foi.
 * Aborta tambem em --dry-run: e o dry-run que a pessoa revisa antes de publicar.
 */
const colisoes = [...plano, ...(nosso ? [nosso] : [])]
  .filter((p) => !p.igual && fs.existsSync(p.b) && !publicadoAntes.has(p.rp))
  .map((p) => p.rp);
const problemas = [];
if (colisoes.length) {
  problemas.push('COLISAO com arquivo pessoal (' + colisoes.length + '): existe em ' + DST + ', nao foi publicado por este deploy e o conteudo difere do catalogo.\n' +
    '  Renomeie o seu, ou apague-o para aceitar o do catalogo, e rode de novo.\n    ' + colisoes.join('\n    '));
}
if (pessoal?.erro) {
  problemas.push('CLAUDE.md pessoal (' + pessoal.alvo + '): ' + pessoal.erro + '.\n' +
    '  Corrija o bloco a mao (ou apague-o inteiro) e rode de novo.');
}
if (problemas.length) {
  console.error('ERRO: nada foi ' + (DRY ? 'publicado (dry-run)' : 'escrito') + '.\n' + problemas.join('\n'));
  process.exit(1);
}

// ---------------------------------------------------------------- fase 2: escrita

const aEscrever = plano.filter((p) => !p.igual);
for (const p of aEscrever) detalhe.copiados.push(p.rp);
if (!DRY) {
  for (const p of [...aEscrever, ...(nosso && !nosso.igual ? [nosso] : [])]) {
    fs.mkdirSync(path.dirname(p.b), { recursive: true });
    if (p.conteudo === null) fs.copyFileSync(p.a, p.b);
    else fs.writeFileSync(p.b, p.conteudo, 'utf8');
  }
  for (const rp of remover) fs.rmSync(path.join(DST, ...rp.split('/')));
}

// Pasta que ficou vazia depois das remocoes (stack que saiu do global, topico que sumiu do hub).
// Vazia ela nao muda o que o Claude carrega, mas polui a navegacao e finge que o topico existe.
// So dentro das pastas espelhadas, e nunca as raizes delas.
let dirsRemovidos = 0;
for (const pasta of ESPELHADAS) {
  const raiz = path.join(DST, pasta);
  if (!fs.existsSync(raiz)) continue;
  const limpar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) limpar(path.join(d, e.name));
    if (d !== raiz && fs.readdirSync(d).length === 0) {
      if (!DRY) fs.rmdirSync(d);
      dirsRemovidos++;
    }
  };
  limpar(raiz);
}

if (pessoal && pessoal.acao !== 'intocado' && !DRY) {
  // Backup so quando o arquivo dela muda, e nunca por cima de outro backup: com o nome so pela
  // data, o 2o deploy do dia sobrescrevia o .bak do 1o — que era o CLAUDE.md original dela.
  if (fs.existsSync(pessoal.alvo)) {
    const carimbo = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let bak = pessoal.alvo + '.bak-' + carimbo;
    for (let n = 2; fs.existsSync(bak); n++) bak = pessoal.alvo + '.bak-' + carimbo + '-' + n;
    fs.copyFileSync(pessoal.alvo, bak);
    console.log('CLAUDE.md pessoal anterior salvo em ' + path.basename(bak));
  }
  fs.mkdirSync(DST, { recursive: true });
  fs.writeFileSync(pessoal.alvo, pessoal.texto, 'utf8');
}

// O nosso CLAUDE.md fica no manifesto mesmo num deploy sem --com-claude-md: saindo dele, o
// proximo deploy com a flag o veria como arquivo pessoal e abortaria por colisao.
const publicadoAgora = plano.map((p) => p.rp);
if (nosso || publicadoAntes.has(NOSSO_RP)) publicadoAgora.push(NOSSO_RP);

if (!DRY) {
  // O unico registro do que ja publicamos: e por ele que o proximo deploy, de qualquer clone, sabe
  // o que pode remover e o que nao e colisao.
  fs.mkdirSync(path.dirname(MANIFESTO), { recursive: true });
  fs.writeFileSync(MANIFESTO, JSON.stringify({ arquivos: publicadoAgora.sort() }, null, 2) + '\n', 'utf8');
}

console.log('\n=========== deploy-global ' + (DRY ? '(DRY RUN — nada escrito)' : '') + ' ===========');
console.log('origem  : ' + SRC);
console.log('destino : ' + DST);
console.log('pastas  : ' + ESPELHADAS.join(', ') + ' e hub4claude/   (o resto de ~/.claude nao e tocado)');
console.log('stacks  : ' + GLOBAL_STACKS.join(', ') + '   (' + ORIGEM_STACKS + ')');
console.log('fora do global (nao publicados): ' + foraDoGlobal.size);
console.log('copiados: ' + aEscrever.length);
console.log('iguais  : ' + (plano.length - aEscrever.length));
console.log('links desfeitos (destino de stack fora do global): ' + linksDesfeitos);
console.log('removidos no destino: ' + remover.length);
console.log('pastas vazias removidas: ' + dirsRemovidos + (DRY ? '  (so as que ja estavam vazias)' : ''));
console.log('preservados (nao publicados por nos, ou em keepFiles): ' + preservados.length);
console.log('manifesto: ' + MANIFESTO + (migrado ? '   (migrado de ' + caminho('manifestoPath') + ')' : ''));
if (nosso) {
  console.log('hub4claude/CLAUDE.md: ' + (nosso.igual ? 'intocado' : nosso.existia ? 'reescrito' : 'criar'));
  console.log('CLAUDE.md pessoal: ' + pessoal.acao);
}

const show = (t, arr, limite) => {
  if (!arr.length) return;
  console.log('\n--- ' + t + ' ---');
  for (const x of (limite ? arr.slice(0, limite) : arr)) console.log('  ' + x);
  if (limite && arr.length > limite) console.log('  ... e mais ' + (arr.length - limite));
};
show('copiados', detalhe.copiados, 25);
// Sai inteira: e mudanca de CONTEUDO publicado, o unico lugar onde o global diverge do repo.
show('links desfeitos — o alvo nao vai para o global (N13)', detalhe.links);
// Remocao sai INTEIRA: e o lado destrutivo, e a revisao antes de publicar (RN12) e item a item.
show('removidos no destino', detalhe.removidos);
tabela();
