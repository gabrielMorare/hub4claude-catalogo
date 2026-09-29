/**
 * catalogo-md.mjs — renderiza o bloco de roteamento do catálogo a partir do estado REAL do .claude.
 *
 * Princípio: o Claude Code já carrega name+description de todas as skills e agentes
 * automaticamente. Um CLAUDE.md que repete o catálogo inteiro é duplicação de contexto
 * paga em toda sessão. Então aqui geramos ROTEAMENTO POR FAMÍLIA e CONVENÇÕES, não lista.
 *
 * Só lê e devolve texto: quem escreve é o deploy (textoGlobal, com as stacks efetivas) e, no repo
 * do admin, o gera-claude-md.mjs (os arquivos versionados). Vai para a distribuição da equipe, então
 * não cita nenhuma ferramenta de admin pelo nome: o que é de manutenção sai da stack (admin/consumo).
 */

import fs from 'fs';
import path from 'path';
import { vaiParaGlobal, stackDe } from './stacks.mjs';
import { caminho } from './config.mjs';

export const CLA = caminho('outPath');
export const GLOBAL_MD = caminho('claudeGlobalPath');

export const INI = '<!-- BEGIN CATALOGO GERADO por tools/gera-claude-md.mjs — nao edite a mao -->';
export const FIM = '<!-- END CATALOGO GERADO -->';

// Normaliza BOM e CRLF: sem isso os regex ancorados em $ nao casam (o \r fica antes do fim
// da linha) e as globs das rules sairiam vazias, declarando toda regra como "sempre ativa".
const semBom = (s) => (s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s);
export const ler = (f) => semBom(fs.readFileSync(f, 'utf8')).replace(/\r\n/g, '\n');
const frontmatter = (t) => {
  if (!t.startsWith('---')) return {};
  const e = t.indexOf('\n---', 3);
  if (e === -1) return {};
  const fm = t.slice(3, e);
  const g = (k) => (fm.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');
  return { name: g('name'), description: g('description') };
};

const lista = (dir) => {
  const d = path.join(CLA, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: f, rp: dir + '/' + f, slug: f.replace(/\.md$/, ''), ...frontmatter(ler(path.join(d, f))) }));
};

/** Skill = pasta skills/<nome>/ com SKILL.md dentro; o comando e o nome da PASTA (F1). */
const listaSkills = () => {
  const d = path.join(CLA, 'skills');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(d, e.name, 'SKILL.md')))
    .map((e) => ({
      file: e.name + '.md',
      rp: 'skills/' + e.name + '/SKILL.md',
      slug: e.name,
      ...frontmatter(ler(path.join(d, e.name, 'SKILL.md'))),
    }));
};

export const comandos = listaSkills();
export const agentes = lista('agents');

/**
 * READMEs de pasta do catalogo, em references/HUB/ (Fase 7, passo 5). Nao sao skill nem
 * reference de skill: nada no catalogo os cita, entao sem uma linha no CLAUDE.md eles ficariam
 * inalcancaveis — o mesmo P2 que o indice de references resolveu para as skills.
 */
const docsHub = (() => {
  const raiz = path.join(CLA, 'references', 'HUB');
  const acc = [];
  const anda = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) anda(p);
      else if (e.name.endsWith('.md')) acc.push({ rp: 'references/HUB/' + path.relative(raiz, p).split(path.sep).join('/') });
    }
  };
  anda(raiz);
  return acc;
})();

// Regras: le os globs do frontmatter 'paths'
export const regras = (() => {
  const d = path.join(CLA, 'rules');
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => {
    const t = ler(path.join(d, f));
    const globs = [...t.matchAll(/^\s+-\s+"(.+)"$/gm)].map((m) => m[1]);
    return { rp: 'rules/' + f, slug: f.replace(/\.md$/, ''), globs };
  });
})();

/** Stacks das skills de manutenção do catálogo: a família delas sai da stack, não do nome. */
const STACKS_MANUTENCAO = ['admin', 'consumo'];

/**
 * Agrupa comandos por família. Avaliado em ordem: nomes exatos primeiro (para os que não
 * seguem prefixo), prefixos depois, e o catch-all `skill-` por último. A meta é não ter
 * balde "Outros" — uma família genérica não ajuda o roteamento em nada.
 */
const FAMILIAS = [
  ['foursys-constitution',                          'Governança — constituição e regras do projeto'],
  ['foursys-',                                      'Playbook SDD — história → spec → tasks → homologação'],
  ['skill-android-',                                'Mobile Android'],
  [['skill-swiftui-components'],                    'Mobile iOS'],
  ['skill-ios-',                                    'Mobile iOS'],
  [['sdd-tasks', 'skill-refinamento-negocio', 'skill-especificacao-tecnica',
    'skill-checklist-homologacao', 'skill-analyze-project'],
                                                    'Playbook SDD — história → spec → tasks → homologação'],
  [['qa-test-data-generation', 'skill-playwright-bdd-feature-generation'],
                                                    'Quality Assurance — plano, casos, automação, dados'],
  [['skill-diagrama-sequencia', 'skill-mermaid-generator'],
                                                    'Documentação e diagramas'],
  [['skill-tdd', 'skill-code-review', 'skill-verificacao-pre-conclusao'],
                                                    'Disciplina de engenharia — TDD, review, gate de conclusão'],
  ['skill-springboot-',                             'Backend Spring Boot — integrações e padrões'],
  ['skill-angular-',                                'Frontend Angular'],
  ['skill-po-',                                     'Product Owner — discovery, PRD, user stories'],
  ['cobol-',                                        'COBOL / Mainframe'],
  ['java-legado-',                                  'Java legado — discovery e análise de impacto'],
  ['fase-qa-',                                      'Quality Assurance — plano, casos, automação, dados'],
  ['skill-',                                        'Skills gerais'],
];
const familiaDe = (c) => {
  if (STACKS_MANUTENCAO.includes(stackDe(c.rp))) return 'Manutenção deste catálogo';
  for (const [m, nome] of FAMILIAS) {
    if (Array.isArray(m) ? m.includes(c.slug) : c.slug.startsWith(m)) return nome;
  }
  return 'Sem família — revise FAMILIAS em tools/catalogo-md.mjs';
};

// Sem data aqui de proposito: qualquer valor volatil no conteudo gera diff em arquivo
// versionado a cada execucao, mesmo sem mudanca no hub. A data do sync fica no state file.
// SHA do hub: proveniencia. Muda so quando o catalogo upstream muda — ao contrario de um
// timestamp, nao gera diff em execucao sem novidade.
let hubSha = '';
try {
  hubSha = JSON.parse(fs.readFileSync(caminho('statePath'), 'utf8')).hubSha || '';
} catch { /* primeira execucao, state ausente, ou a distribuicao (que nao tem state) */ }
if (!hubSha) {
  // O state file nao e versionado: num clone novo, um deploy apagaria a proveniencia do
  // CLAUDE.md. Na falta dele, reaproveita o SHA ja escrito num bloco gerado.
  for (const f of [path.join(CLA, 'CLAUDE.md'), GLOBAL_MD]) {
    if (hubSha || !fs.existsSync(f)) continue;
    hubSha = (ler(f).match(/do commit `([0-9a-f]{7,40})`/) || [])[1] || '';
  }
}
export const HUB_SHA = hubSha;

/**
 * Monta o bloco do catálogo com os itens que passam no filtro. `lista` (stacks) = versão global;
 * `extraProjeto` = linhas da seção de manutenção na versão do repo (o admin passa as dele).
 */
export function bloco(filtro, lista = null, extraProjeto = []) {
  const global = Boolean(lista);
  const cmds = comandos.filter(filtro);
  const ags = agentes.filter(filtro);
  const rgs = regras.filter(filtro);

  const grupos = new Map();
  for (const c of cmds) {
    const f = familiaDe(c);
    if (!grupos.has(f)) grupos.set(f, []);
    grupos.get(f).push(c);
  }

  const linhas = [];
  linhas.push(INI);
  linhas.push('');
  linhas.push('> Gerado pelo hub4claude a partir do hub Foursys' +
              (hubSha ? ', do commit `' + hubSha.slice(0, 12) + '`' : '') + '.');
  if (global) {
    linhas.push('> Publicado no global só o que é das stacks: ' + lista.map((s) => '`' + s + '`').join(', ') +
                '. O catálogo completo fica no `.claude/` do repo de onde ele foi publicado.');
  }
  linhas.push('');
  linhas.push('## Roteamento');
  linhas.push('');
  linhas.push('O Claude Code já carrega `name` e `description` de **todas** as ' + cmds.length +
              ' skills e ' + ags.length + ' agentes — não é preciso listá-las aqui. Use `/skills` para ver o catálogo.');
  linhas.push('Esta tabela existe só para dizer **quando** ir a cada família.');
  linhas.push('');
  linhas.push('| Quando a tarefa é… | Família | Qtd |');
  linhas.push('|---|---|---|');
  for (const [fam, itens] of [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const exemplo = itens.slice(0, 3).map((i) => '`/' + i.slug + '`').join(', ');
    linhas.push('| ' + fam + ' | ' + exemplo + (itens.length > 3 ? ', …' : '') + ' | ' + itens.length + ' |');
  }
  linhas.push('');
  linhas.push('**Agentes** (trabalho end-to-end; skill é etapa pontual): ' +
              ags.map((a) => '`' + a.slug + '`').join(', ') + '.');
  linhas.push('');
  linhas.push('## Regras automáticas');
  linhas.push('');
  linhas.push('Carregam sozinhas quando o Claude toca em arquivo compatível — não precisa invocar:');
  linhas.push('');
  linhas.push('| Regra | Aplica em |');
  linhas.push('|---|---|');
  for (const r of rgs) {
    linhas.push('| `' + r.slug + '` | ' + (r.globs.length ? r.globs.map((g) => '`' + g + '`').join(', ') : '**sempre ativa**') + ' |');
  }
  linhas.push('');
  // As "Regras de uso" so existiam no CLAUDE.md do projeto — justo o arquivo que NAO vai para o
  // global. Sem elas, nada no ~/.claude mandava o Claude abrir a reference de uma skill (P2/P10).
  linhas.push('## Regras de uso');
  linhas.push('');
  linhas.push('1. **Consulte a skill antes de gerar código** da stack: é ela que define os padrões obrigatórios.');
  linhas.push('2. **As rules carregam sozinhas** quando o Claude toca em arquivo compatível — não precisa citar.');
  linhas.push('3. **Abra a reference** listada em "References desta skill" quando a implementação exigir o');
  linhas.push('   detalhe (transações MongoDB, DLT Kafka, hexagonal com Feign). Elas não carregam sozinhas —');
  linhas.push('   é deliberado: custam contexto só quando abertas.');
  linhas.push('4. **Use o agente** quando a tarefa for feature completa end-to-end; a skill é etapa pontual.');
  linhas.push('');
  linhas.push('## Manutenção deste catálogo');
  linhas.push('');
  linhas.push('Tudo abaixo de `skills/`, `agents/` e `rules/` vem do hub Foursys e é');
  linhas.push('**sobrescrito** a cada publicação. Não edite esses arquivos à mão:');
  linhas.push('');
  const docs = docsHub.filter(filtro);
  if (docs.length) {
    linhas.push('A documentação do próprio hub (os ' + docs.length + ' `README.md` das pastas do catálogo) está em');
    linhas.push('`references/HUB/`, no mesmo caminho que tem lá. Não carrega sozinha: abra quando precisar');
    linhas.push('entender como a Foursys organiza o catálogo.');
    linhas.push('');
  }
  if (global) {
    // O comando `node tools/...` so existe dentro do repo, e este arquivo carrega em todo projeto
    // da maquina: aqui vale a skill, que funciona de qualquer lugar. Cada skill so e anunciada se
    // foi publicada, e pela stack: quem nao tem o hub nao recebe a de admin.
    const daStack = (id) => cmds.filter((c) => stackDe(c.rp) === id).map((c) => '`/' + c.slug + '`');
    const consumo = daStack('consumo');
    const admin = daStack('admin');
    if (consumo.length) linhas.push('- para escolher as stacks desta máquina e publicar de novo: ' + consumo.join(', ') + ';');
    if (admin.length) {
      linhas.push('- para atualizar o catálogo a partir do hub Foursys (sync, revisão e publicação): ' + admin.join(', ') + ';');
      linhas.push('- conhecimento local que o hub não tem → overlay (`tools/overlays/`) no repo do conversor, nunca editando aqui;');
    } else {
      linhas.push('- skill sua com o mesmo nome de uma do catálogo faz a publicação parar: dê outro nome à sua;');
    }
    linhas.push('- rule de arquitetura fica **fora** do global de propósito: copie a do seu projeto para o');
    linhas.push('  `.claude/rules/` dele.');
  } else {
    linhas.push(...extraProjeto);
  }
  linhas.push('');
  linhas.push(FIM);
  return { texto: linhas.join('\n'), cmds, ags, rgs, grupos };
}

/** Bloco global (com o `\n` final) para uma lista de stacks. Usado pelo deploy com a lista efetiva. */
export const textoGlobal = (lista) => bloco((item) => vaiParaGlobal(item.rp, lista), lista).texto + '\n';
