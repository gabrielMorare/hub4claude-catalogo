# CLAUDE.md

Este repo distribui o catálogo Foursys (skills, agentes e rules) já convertido para o Claude Code,
e publica no `~/.claude` só as stacks que cada pessoa escolhe. Não contém o conversor nem o hub.

- Este clone é só o instalador. Para trabalhar, abra o Claude no seu projeto: lá vale o que foi
  publicado no `~/.claude`, sem o catálogo em dobro.
- Para instalar, trocar as stacks ou atualizar depois de um `git pull`: `/catalogo-foursys`.
- Não edite `.claude/` nem `tools/`: tudo vem de quem mantém o catálogo e é sobrescrito na
  próxima versão. A sua escolha de stacks fica em `tools/sync.local.json`, fora do git.
- Comandos (Git Bash, Node 20+), da raiz deste repo:

```bash
node tools/deploy-global.mjs --stacks                   # stacks dentro e fora do global
node tools/deploy-global.mjs --stacks=java,angular      # escolhe só para esta máquina
node tools/verifica-referencias.mjs --strict            # 0 quebras antes de publicar
node tools/deploy-global.mjs --com-claude-md --dry-run  # o que mudaria no ~/.claude
node tools/deploy-global.mjs --com-claude-md            # publica
```
