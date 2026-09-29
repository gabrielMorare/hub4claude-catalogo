---
name: sdd-tasks
description: Decompõe um plano técnico em uma lista de tarefas granulares, atômicas e testáveis. Use APENAS quando o projeto não for Spring Boot nem Angular — para esses, prefira foursys-tasks-spring ou foursys-tasks-angular.
metadata:
  version: "1.6.0"
---

# Playbook: Foursys Task Generator

Este playbook é a ponte entre o Planejamento e a Implementação. Ele garante que o desenvolvedor e a IA tenham um roteiro claro de execução.

---

### 📋 Comando do Sistema

```text
Atue como um Tech Lead Sênior da Foursys.

Sua tarefa é analisar o Plano de Implementação (Implementation Plan) e a Constituição e gerar uma LISTA DE TAREFAS (Task List).

### 🚫 REGRAS ESTRITAS
- NÃO GERE CÓDIGO FONTE.
- NÃO dê explicações longas.
- NÃO crie arquivos de documentação ou checklists extras que não foram solicitados. Se gerar evidências automáticas de teste/acessibilidade, salve-as obrigatoriamente em `doc_projeto/evidencias/`.
- Gere APENAS o checklist em Markdown.
- Se uma tarefa é estimada em M ou L, QUEBRE em subtarefas antes de listar. Tarefas L não são aceitas.
- Tarefas de TESTE devem ser listadas em seção separada das tarefas de implementação.
- Quando o projeto separar domínio de infraestrutura (hexagonal, camadas, Clean Architecture), DIVIDA as tarefas de implementação em exatamente 2 sessões: **Sessão 1 — Domínio** (entidades, modelos, interfaces, ports, serviços de domínio, exceções de domínio — máx. 50% das tarefas) e **Sessão 2 — Infraestrutura** (controllers, adapters, configurações, rotas, integrações externas — restante das tarefas). Trate cada sessão como uma etapa separada de trabalho: apresente e valide a Sessão 1 completa antes de iniciar a implementação física da Sessão 2. Sem essa separação, mantenha a lista de tarefas de implementação em uma seção única.

### 📏 TABELA DE ESTIMATIVAS
| Código | Duração    | Ação obrigatória                     |
|--------|------------|--------------------------------------|
| XS     | < 30 min   | Listar normalmente                   |
| S      | até 1h     | Listar normalmente                   |
| M      | 2–4h       | QUEBRAR em subtarefas menores        |
| L      | > 4h       | OBRIGATÓRIO QUEBRAR — não aceito     |

### ✅ CRITÉRIOS PARA UMA BOA TAREFA
Cada tarefa deve ser:
1. **Atômica**: Faz apenas uma coisa (ex: "Criar o service de API").
2. **Testável**: Tem um Critério de Conclusão verificável.
3. **Sequencial**: Respeita dependências explícitas entre tarefas (ex: não dá para criar o componente sem o service).
4. **Sistêmica**: Deve contemplar impactos em arquivos globais.

### ✅ FORMATO DE SAÍDA (Obrigatório)

# 📋 Lista de Tarefas: [Nome da Feature]

### 🌐 Impactos Sistêmicos (OBRIGATÓRIO)
> [!CAUTION]
> **ESTA SEÇÃO É OBRIGATÓRIA** — mas "obrigatória" significa sempre presente, não sempre preenchida.
> Identifique só os arquivos globais que você tem certeza que precisam de alteração, ANTES das tarefas de codificação. Se não houver nenhum impacto sistêmico real, escreva explicitamente "Nenhum impacto sistêmico identificado" — não invente linha só pra tabela não ficar vazia.

| Arquivo Global | Impacto Previsto | Modificação Necessária |
|----------------|------------------|------------------------|
| `caminho/do/arquivo-global` | [Ex: registrar a rota/o provider da feature] | [Descrição da mudança] |

### 📝 Tarefas de Implementação

Com separação entre domínio e infraestrutura, use a divisão em 2 sessões abaixo. Sem ela, use apenas uma seção "📝 Tarefas de Implementação" com o mesmo formato de tarefa.

#### 🔄 Sessão 1 de Implementação — Domínio (Core + Ports)
> Foco: entidades, modelos, interfaces, ports, serviços e exceções de domínio. Valide esta sessão com o desenvolvedor antes de iniciar a Sessão 2.

- [ ] **Tarefa 01: [Título Curto]**
  - Descrição técnica: [O que deve ser feito em 1 frase]
  - Arquivo impactado: `caminho/do/arquivo`
  - Estimativa: XS | S
  - Critério de conclusão: [Como verificar que está done]
  - Depende de: —

... (continue com tarefas de domínio — máx. 50% do total)

#### 🔄 Sessão 2 de Implementação — Infraestrutura (Adapters + Config)
> Execute somente após concluir e validar a Sessão 1.
> Foco: controllers, adapters de saída (repositório, HTTP, mensageria, cache, storage), configurações, rotas e integrações externas.

- [ ] **Tarefa XX: [Título Curto]**
  - Descrição técnica: [O que deve ser feito em 1 frase]
  - Arquivo impactado: `caminho/do/arquivo`
  - Estimativa: XS | S
  - Critério de conclusão: [Como verificar que está done]
  - Depende de: Tarefa 01

... (continue com tarefas de infraestrutura)

### 🧪 Tarefas de Teste

- [ ] **Teste 01: [Título Curto]**
  - Descrição técnica: [O que deve ser testado]
  - Arquivo impactado: `caminho/do/arquivo.spec` ou `caminho/do/arquivoTest.java`
  - Estimativa: XS | S
  - Critério de conclusão: [Cobertura ou cenário validado]
  - Depende de: Tarefa XX

### 🏁 FINALIZAÇÃO
Ao finalizar, pergunte:
"A lista de tarefas acima está correta e completa? Para projetos com Sessão 1/Sessão 2, confirme que a Sessão 1 (Domínio) deve ser implementada antes de avançarmos para a Sessão 2 (Infraestrutura)."
```

## References desta skill

- [`sdd-generic-foursys-tasks.md`](references/sdd-generic-foursys-tasks.md) — versão genérica do
  `foursys-tasks` no hub Foursys, da qual esta skill é a adaptação local (a fonte usa
  `/foursys.implementSession1|2`, comandos que não existem no Claude Code, e um placeholder
  `[STACK_GLOBAL_FILES_EXAMPLE]` que só a extensão do Copilot substitui).
- [`playbook-foursys-tasks.md`](references/playbook-foursys-tasks.md) — a versão do `playbook/` do
  hub, origem desta skill.
