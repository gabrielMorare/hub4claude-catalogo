---
name: catalogo-foursys
description: Publica no ~/.claude global o catálogo Foursys que já está convertido no repo do hub4claude, só com as stacks que o usuário escolher para esta máquina. Não precisa do hub da Foursys nem converte nada. Mostra as stacks, pergunta quais sobem, confere referências, mostra o dry-run e publica. Use para instalar o catálogo numa máquina, trocar as stacks do global ou republicar depois de um git pull do repo.
---

# Publicar o catálogo Foursys no global

Publica o `.claude/` do repo em `~/.claude`, filtrado pelas stacks desta máquina. Não lê o hub,
não roda o conversor e não muda nada versionado: a escolha fica em `tools/sync.local.json`, fora
do git. Atualizar o catálogo a partir do hub é trabalho de quem mantém o catálogo; aqui chega pelo
`git pull`.

## Onde rodar

Na raiz do repo que contém `tools/deploy-global.mjs`. Se o diretório atual não for esse, **pergunte
o caminho ao usuário** — não procure pelo disco. Rode pelo Git Bash (ferramenta Bash).

## Passos

Pare e reporte em qualquer passo que não saia como descrito.

1. **O que vai ser publicado.** Diga ao usuário o commit do hub (linha `do commit` no topo de
   `tools/CLAUDE.global.md`) e a data do catálogo: `git log -1 --format=%cs -- .claude`.
   Primeira vez na máquina: confira `node --version` (20+) e que o shell é o Git Bash.
2. **Repo em dia.** `git fetch` e `git rev-list --count HEAD..@{u}`:
   - maior que 0 → o repo está atrás do `origin`: pare e sugira `git pull`;
   - `fetch` falhou (sem rede) ou branch sem upstream → avise que não deu para conferir e só siga
     se o usuário confirmar.
3. **Stacks.** `node tools/deploy-global.mjs --stacks` → mostre em tabela as stacks no global e
   fora dele, e de onde vem a lista (`padrão` ou `local`). Pergunte (AskUserQuestion):
   "Manter" / "Mudar" / "Voltar ao padrão".
   - Mudar: peça os ids e rode `node tools/deploy-global.mjs --stacks=<id1>,<id2>`.
   - Voltar ao padrão: `node tools/deploy-global.mjs --stacks=padrao`.
   - A stack `pendente` não entra: são casos ambíguos aguardando decisão.
4. `node tools/verifica-referencias.mjs --strict` → tem que dar 0 quebras.
5. `node tools/deploy-global.mjs --com-claude-md --dry-run` → mostre a lista "removidos no destino"
   inteira. Só pode ter o que é de stack que saiu do global (`stack X fora do global`) ou o que
   saiu do repo no último `git pull`. Qualquer outra remoção: pare. Diga também o que acontece com
   o `CLAUDE.md` do usuário (linha `CLAUDE.md pessoal:`): `criar`, `acrescentar bloco`, `migrar
   bloco antigo` ou `intocado` — em todos, o texto dele fora do bloco `hub4claude` fica como está.
6. Pergunte (AskUserQuestion): "Publicar" / "Parar". Publicar →
   `node tools/deploy-global.mjs --com-claude-md`.

## Como ler a saída

| Mensagem | O que fazer |
|---|---|
| `ERRO: ... sync.local.json nao e JSON valido` / `cita stack inexistente` | a escolha local está quebrada: `--stacks=padrao` não roda assim; apague o arquivo e escolha de novo no passo 3 |
| `ERRO: stack inexistente` (no `--stacks=`) | id digitado errado; nada foi gravado. Mostre os ids válidos que a mensagem lista |
| `ERRO: ... arquivo(s) do .claude/ sem stack` | o repo está inconsistente: pare e avise quem mantém o catálogo |
| `COLISAO com arquivo pessoal` | o usuário tem um arquivo seu com o mesmo caminho de um do catálogo (ex.: skill pessoal de mesmo nome); nada foi escrito. Mostre a lista e pergunte: renomear o dele, ou apagá-lo para aceitar o do catálogo. Nunca apague por conta própria |
| `CLAUDE.md pessoal ... sem par` | o `~/.claude/CLAUDE.md` tem um `BEGIN` sem `END` do bloco `hub4claude` (ou do antigo `CATALOGO GERADO`); nada foi escrito. Mostre o trecho e peça para o usuário corrigir ou apagar o bloco |

## O que esta skill não pode fazer

- Converter o catálogo, nem editar `tools/sync.config.json` ou o `.claude/` do repo.
- Publicar sem o dry-run do passo 5 revisado pelo usuário.
