# Catálogo Foursys para o Claude Code

Skills, agentes e rules do hub Foursys, já no formato do Claude Code. A publicação vai para o
seu `~/.claude` e passa a valer em todo projeto, só com as stacks que você escolher.

## Pré-requisitos

- Claude Code instalado e logado.
- Node 20 ou mais novo (`node --version`).
- Git; no Windows, rode tudo pelo **Git Bash**.

## Instalar

1. `git clone <url deste repo>` e entre na pasta.
2. Abra o Claude Code nela (`claude`).
3. Rode `/catalogo-foursys`: ele mostra as stacks, pergunta quais você quer, confere as
   referências, mostra o que vai mudar no `~/.claude` e só publica com o seu ok.

## Atualizar

`git pull` e `/catalogo-foursys` de novo. O `CLAUDE.md` do seu `~/.claude` não muda: ele só
importa `~/.claude/hub4claude/CLAUDE.md`, que é o que a publicação atualiza.

## O que a publicação faz no seu `~/.claude`

- copia as skills, agentes e rules das stacks escolhidas e remove só o que ela mesma publicou;
- acrescenta ao seu `CLAUDE.md` um bloco curto `hub4claude` (com backup antes); o resto fica;
- se você já tem um arquivo com o mesmo caminho de um do catálogo, ela **para** e lista: você
  decide se renomeia o seu ou aceita o do catálogo.

## Desinstalar

Apague o bloco `hub4claude` do `~/.claude/CLAUDE.md`, os arquivos listados em
`~/.claude/hub4claude/manifesto.json` e, por último, a pasta `~/.claude/hub4claude/`.

## Privacidade

Antes de usar em código de cliente, confira as suas configurações de privacidade no Claude Code
(`/privacy-settings`).
