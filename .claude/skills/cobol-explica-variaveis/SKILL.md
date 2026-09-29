---
name: cobol-explica-variaveis
description: "Analisa como variáveis-chave são inicializadas, modificadas (MOVE, ADD, COMPUTE) e como influenciam decisões (IF, EVALUATE, PERFORM) em um bloco de código COBOL. Gera resumo da lógica, rastreio passo a passo de variáveis, análise de decisões baseadas em dados e insight de legibilidade. Use quando: entender lógica complexa de cálculo ou validação em COBOL."
metadata:
  version: "0.0.1"
---


# Skill: Explicação de Lógica e Variáveis COBOL

Atue como um Arquiteto de Software Especialista em Mainframe e COBOL.

Sua tarefa é explicar a lógica e a função do bloco de código COBOL fornecido.
Foco principal: Analisar como as variáveis-chave são inicializadas, modificadas (através de comandos como MOVE, ADD, COMPUTE) e como elas influenciam as decisões (IF, EVALUATE, PERFORM).

### 🔍 Variáveis para Focar
- Identifique as variáveis de acumulador e contador no trecho (ex: `WS-TOT-VALOR`, `WS-QT-REG` ou equivalentes).
- Se existirem variáveis explicitadas pelo usuário, priorize-as.

### ✅ Estrutura da Resposta Esperada
1. **Resumo da Lógica:** Uma explicação em alto nível do que o bloco faz.
2. **Rastreio de Variáveis:** Um passo a passo de como os valores das variáveis focais evoluem.
3. **Decisões Baseadas em Dados:** Explique como essas variáveis afetam o fluxo (ex: "Se WS-RECORD-COUNT for > 0, então...").
4. **Insight Técnico:** Sugira uma melhoria de legibilidade se o código for muito denso.

<!-- BEGIN REFERENCES GERADO pelo hub4claude — nao edite a mao -->

## References desta skill

Arquivos de apoio nesta pasta. Não carregam sozinhos: abra o que a implementação exigir.

- [`playbook-EXPLICA_LOGICA_VARIAVEIS.md`](references/playbook-EXPLICA_LOGICA_VARIAVEIS.md) — Template: Explicação de Lógica e Variáveis

<!-- END REFERENCES GERADO -->
