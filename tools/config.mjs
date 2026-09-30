/**
 * config.mjs — carrega tools/sync.config.json uma vez, para todos os scripts do hub4claude.
 *
 * HUB4CLAUDE_CONFIG=<caminho> troca o config (relativo a raiz do repo ou absoluto). Existe para a
 * suite tools/test/ rodar o encadeamento conversao -> geracao dos CLAUDE.md -> verificacao num
 * sandbox: execSync herda o ambiente, entao os filhos leem o mesmo config.
 *
 * Trocar so o config nao isola nada se algum script escrever num caminho fixo. Por isso todo
 * caminho de ESCRITA vem daqui, com o caminho de sempre como default — quem nao define a chave
 * nao ve diferenca nenhuma:
 *
 *   outPath           .claude
 *   statePath         tools/.foursys-sync.json
 *   indicePath        tools/catalogo-stacks.json
 *   claudeGlobalPath  tools/CLAUDE.global.md
 *   readmePath        tools/README.md
 *   cachePath         tools/.cache-subtrees
 *   manifestoPath     tools/.deploy-global-manifest.json   (lugar ANTIGO do manifesto do deploy, que
 *                     hoje mora no destino: ~/.claude/hub4claude/manifesto.json. So lido para migrar)
 *   localPath         tools/sync.local.json   (escolha desta maquina, fora do git; o deploy grava)
 *
 * Caminho relativo e relativo a raiz do repo (hubPath inclusive); absoluto fica como esta.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_ALTERNATIVO = Boolean(process.env.HUB4CLAUDE_CONFIG);
export const CONFIG_PATH = CONFIG_ALTERNATIVO
  ? path.resolve(ROOT, process.env.HUB4CLAUDE_CONFIG)
  : path.join(ROOT, 'tools', 'sync.config.json');
export const CFG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const PADRAO = {
  outPath: '.claude',
  statePath: 'tools/.foursys-sync.json',
  indicePath: 'tools/catalogo-stacks.json',
  claudeGlobalPath: 'tools/CLAUDE.global.md',
  readmePath: 'tools/README.md',
  cachePath: 'tools/.cache-subtrees',
  manifestoPath: 'tools/.deploy-global-manifest.json',
  localPath: 'tools/sync.local.json',
};

/** Caminho absoluto de uma chave do config (ou do default dela). */
export const caminho = (chave) => path.resolve(ROOT, CFG[chave] ?? PADRAO[chave]);
