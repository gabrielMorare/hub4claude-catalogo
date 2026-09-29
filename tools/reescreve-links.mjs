/**
 * reescreve-links.mjs — desfaz, no que vai para o global, o link markdown cujo destino nao foi
 * publicado.
 *
 * O .claude/ do repo recebe TUDO do hub (RN0); o ~/.claude, so as stacks de globalStacks (RN11).
 * Arquivo publicado que cita um destino de stack que ficou de fora resolve no repo e quebra no
 * global (N13) — e quebra de referencia nao da erro em lugar nenhum: o Claude tenta abrir, nao
 * acha e segue sem o detalhe. Aqui o link vira texto puro: o leitor mantem a informacao e nao
 * sobra caminho morto.
 *
 * So no global. No .claude/ do repo o alvo existe e o link fica como esta (RN0).
 */
import path from 'path';

/** Link markdown para .md, com fragmento opcional: [texto](caminho.md#ancora) */
const LINK = /\[([^\]\n]*)\]\(([^)\s#]+\.md)(#[^)\s]*)?\)/g;

const VAR_SKILL = '${CLAUDE_SKILL_DIR}/';

/**
 * `referenciasAceitas` do config como mapa arquivo -> Set de citados. Entrada cuja chave comeca
 * com `_` e comentario (RN13). Fica aqui para o deploy e o verificador lerem a mesma coisa.
 */
export const mapaAceitas = (cfg) => new Map(
  Object.entries(cfg.referenciasAceitas || {})
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => [k, new Set(v)])
);

/**
 * Onde um caminho citado pode resolver — as mesmas bases do verifica-referencias.mjs: a pasta do
 * proprio arquivo e, dentro de skills/<nome>/, a raiz da skill (o valor de ${CLAUDE_SKILL_DIR}).
 * Devolve caminhos relativos a raiz do catalogo, no mesmo formato das chaves de `publicados`.
 */
export function basesDoCitado(relArquivo, citado) {
  const partes = relArquivo.split('/');
  const raizSkill = partes[0] === 'skills' && partes.length > 2 ? 'skills/' + partes[1] : null;
  const junta = (base, alvo) => path.posix.normalize(path.posix.join(base, alvo));
  if (citado.startsWith(VAR_SKILL)) {
    return raizSkill ? [junta(raizSkill, citado.slice(VAR_SKILL.length))] : [];
  }
  return [junta(path.posix.dirname(relArquivo), citado), raizSkill && junta(raizSkill, citado)]
    .filter(Boolean);
}

/**
 * Troca `[texto](caminho)` por `texto` quando nenhuma base resolve para um arquivo publicado.
 *
 * - Bloco de codigo nao e tocado: ali o caminho e exemplo de saida, nao referencia (mesma regra
 *   do sync e do verificador).
 * - `aceitas` (referenciasAceitas do config) fica intacta: sao quebras conhecidas, registradas com
 *   o porque, e incluem link para artefato que a propria skill GERA em tempo de execucao — desfazer
 *   esses estragaria a instrucao em vez de limpar o catalogo.
 *
 * Trabalha em LF; quem escreve decide o fim de linha.
 */
export function reescreverLinksQuebrados(conteudo, { relArquivo, publicados, aceitas = new Set() }) {
  let emCodigo = false;
  const desfeitos = [];
  const texto = conteudo.split('\n').map((linha) => {
    if (/^\s*```/.test(linha)) { emCodigo = !emCodigo; return linha; }
    if (emCodigo) return linha;
    return linha.replace(LINK, (m, rotulo, citado) => {
      if (/^(https?:|mailto:|\/)/i.test(citado) || aceitas.has(citado)) return m;
      const bases = basesDoCitado(relArquivo, citado);
      // Sem base conhecida (a variavel fora de skills/) nao ha o que decidir: fica como esta.
      if (!bases.length || bases.some((b) => publicados.has(b))) return m;
      desfeitos.push(citado);
      return rotulo;
    });
  }).join('\n');
  return { texto, desfeitos };
}
