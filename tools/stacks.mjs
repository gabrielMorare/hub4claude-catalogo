/**
 * stacks.mjs — classifica cada arquivo do catalogo numa stack e decide o que vai para o global.
 *
 * O .claude/ do repo recebe TUDO do hub (RN0). O ~/.claude recebe so as stacks listadas em
 * `globalStacks` (RN11). A stack de cada arquivo vem da ORIGEM no hub (prefixo de caminho em
 * `stacks.<id>.origens`, o mais longo vence) ou, para autoria local, de `stacks.<id>.locais`.
 *
 * O sync grava em tools/catalogo-stacks.json a PROCEDENCIA de cada destino (origem no hub, e a
 * skill dona quando e anexo de `referenciaDe`), nunca a stack. A stack e sempre calculada do
 * config na hora da leitura: gravada, ela ficaria desatualizada em relacao ao config e mudar a
 * classificacao de um arquivo nao teria efeito ate alguem rodar um sync de verdade.
 * Arquivo sem stack nao e publicado: o deploy aborta (RN4).
 */

import fs from 'fs';
import path from 'path';
import { CFG, caminho } from './config.mjs';

export { ROOT } from './config.mjs';
export const INDICE = caminho('indicePath');
export const STACKS = CFG.stacks || {};

/**
 * Duas listas, com nome. O config versionado e a POLITICA COMUM: GLOBAL_STACKS_PADRAO, o que uma
 * pessoa nova recebe, e o que os arquivos versionados (CLAUDE.global.md, tabela do README)
 * refletem. A escolha de cada maquina fica em `localPath` (tools/sync.local.json, fora do git) e,
 * existindo, vence: GLOBAL_STACKS e o que o deploy publica. Sem essa separacao, cada pessoa que
 * escolhesse outras stacks sujaria o git a cada deploy.
 */
export const GLOBAL_STACKS_PADRAO = CFG.globalStacks || [];
export const LOCAL_PATH = caminho('localPath');
let local = null;
if (fs.existsSync(LOCAL_PATH)) {
  try { local = JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8')); } catch (e) {
    console.error('ERRO: ' + LOCAL_PATH + ' nao e JSON valido (' + e.message + ').\n' +
      'Corrija, ou apague o arquivo para voltar ao padrao de tools/sync.config.json.');
    process.exit(1);
  }
  if (!Array.isArray(local?.globalStacks)) {
    console.error('ERRO: ' + LOCAL_PATH + ' sem a lista "globalStacks".');
    process.exit(1);
  }
}
export const GLOBAL_STACKS = local ? local.globalStacks : GLOBAL_STACKS_PADRAO;
export const ORIGEM_STACKS = local ? 'local' : 'padrão';

/** Ids que nao existem em `stacks`. Vazio = lista valida. */
export const stacksInexistentes = (lista) => lista.filter((id) => !STACKS[id]);

// Config invalido aqui vira publicacao errada no global de todo projeto: melhor abortar.
{
  const erros = [];
  for (const id of stacksInexistentes(GLOBAL_STACKS_PADRAO)) erros.push('globalStacks cita stack inexistente: ' + id);
  for (const id of local ? stacksInexistentes(local.globalStacks) : []) erros.push(LOCAL_PATH + ': globalStacks cita stack inexistente: ' + id);
  const dono = new Map();
  for (const [id, s] of Object.entries(STACKS)) {
    for (const p of [...(s.origens || []), ...(s.locais || []).map((l) => 'local:' + l)]) {
      if (dono.has(p)) erros.push('"' + p + '" esta em duas stacks: ' + dono.get(p) + ' e ' + id);
      dono.set(p, id);
    }
  }
  if (erros.length) {
    console.error('ERRO de stacks (tools/sync.config.json ou ' + LOCAL_PATH + '):\n  ' + erros.join('\n  '));
    process.exit(1);
  }
}

const casa = (alvo, prefixo) => alvo === prefixo || alvo.startsWith(prefixo);

/** Stack de um arquivo do hub, pelo caminho de origem (relativo a catalog/; sdd/ = subarvore). */
export function stackDaOrigem(r) {
  let melhor = null, tam = -1;
  for (const [id, s] of Object.entries(STACKS)) {
    for (const p of s.origens || []) if (casa(r, p) && p.length > tam) { melhor = id; tam = p.length; }
  }
  return melhor;
}

/** Stack de um arquivo de autoria local (keepFiles), pelo caminho dentro do .claude/. */
export function stackLocal(rp) {
  for (const [id, s] of Object.entries(STACKS)) {
    for (const l of s.locais || []) if (rp === l || rp.startsWith(l.replace(/\/?$/, '/'))) return id;
  }
  return null;
}

let indice = null;
function carregaIndice() {
  if (indice) return indice;
  indice = fs.existsSync(INDICE) ? JSON.parse(fs.readFileSync(INDICE, 'utf8')) : {};
  // Formato antigo (destino -> id de stack, string). Ignorar em vez de interpretar: assim os
  // arquivos aparecem como SEM STACK e o deploy aborta, em vez de publicar por um mapa velho.
  if (Object.values(indice).some((v) => typeof v !== 'object' || v === null)) {
    console.error('AVISO: ' + INDICE + ' esta no formato antigo: a conversao precisa regrava-lo (quem mantem o catalogo).');
    indice = Object.fromEntries(Object.entries(indice).filter(([, v]) => v && typeof v === 'object'));
  }
  return indice;
}

/**
 * Stack de um arquivo do .claude/ (ex.: 'commands/skill-angular-http.md'); null = sem stack.
 * Anexo de `referenciaDe` herda a stack da skill dona: ele so faz sentido junto dela.
 */
export function stackDe(rp, vistos = new Set()) {
  /**
   * Reference dentro da pasta de uma skill herda a stack da SKILL, nao a da propria origem no
   * hub. Ela so existe por causa da skill, o SKILL.md a lista no indice gerado, e o caminho e
   * relativo a pasta dela. Classificar pela origem separava as duas: o design-system Angular ia
   * para o global e as references `android-liquid`/`ios-liquid` que ele cita ficavam para tras,
   * virando link quebrado que so aparecia no ~/.claude, nunca no repo.
   */
  const m = /^skills\/([^/]+)\/references\//.exec(rp);
  if (m && !vistos.has(rp)) {
    vistos.add(rp);
    const daSkill = stackDe('skills/' + m[1] + '/SKILL.md', vistos);
    if (daSkill) return daSkill;
  }

  const e = carregaIndice()[rp];
  if (!e) return stackLocal(rp);
  if (e.dona) {
    if (vistos.has(rp)) return null; // config circular: melhor sem stack (o deploy trava) que loop
    vistos.add(rp);
    return stackDe(e.dona, vistos);
  }
  return e.origem ? stackDaOrigem(e.origem) : null;
}

/**
 * Rule que fica no .claude/ do repo e nao vai para o global (P3): no ~/.claude toda rule com
 * paths amplo carrega em TODO projeto da maquina, e duas arquiteturas "obrigatorias" ao mesmo
 * tempo fazem o Claude escolher uma de forma imprevisivel. Mora aqui, e nao no deploy, para o
 * CLAUDE.md global anunciar exatamente o que foi publicado (RN11).
 */
const RULES_FORA = new Set((CFG.globalExcludeRules || []).filter((r) => !r.startsWith('_')));
export const ruleForaDoGlobal = (rp) => rp.startsWith('rules/') && RULES_FORA.has(path.basename(rp, '.md'));

export const vaiParaGlobal = (rp, lista = GLOBAL_STACKS) => !ruleForaDoGlobal(rp) && lista.includes(stackDe(rp));

/** Uma linha por stack, na ordem do config: id, nome, se vai para o global e quantos arquivos tem. */
export function resumoStacks(arquivos, lista = GLOBAL_STACKS) {
  const conta = {};
  for (const rp of arquivos) { const s = stackDe(rp); if (s) conta[s] = (conta[s] || 0) + 1; }
  return Object.entries(STACKS).map(([id, s]) => ({
    id, nome: s.nome, noGlobal: lista.includes(id), arquivos: conta[id] || 0,
  }));
}
