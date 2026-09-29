<!-- BEGIN CATALOGO GERADO por tools/gera-claude-md.mjs — nao edite a mao -->

> Gerado pelo hub4claude a partir do hub Foursys, do commit `cfc66715daec`.
> Publicado no global só o que é das stacks: `java`, `node`, `angular`, `arquitetura`, `qa`, `consumo`. O catálogo completo fica no `.claude/` do repo de onde ele foi publicado.

## Roteamento

O Claude Code já carrega `name` e `description` de **todas** as 67 skills e 3 agentes — não é preciso listá-las aqui. Use `/skills` para ver o catálogo.
Esta tabela existe só para dizer **quando** ir a cada família.

| Quando a tarefa é… | Família | Qtd |
|---|---|---|
| Backend Spring Boot — integrações e padrões | `/skill-springboot-autorizador`, `/skill-springboot-blob-storage`, `/skill-springboot-certificado`, … | 16 |
| Quality Assurance — plano, casos, automação, dados | `/fase-qa-automation`, `/fase-qa-automation-angular`, `/fase-qa-automation-spring`, … | 15 |
| Frontend Angular | `/skill-angular-component`, `/skill-angular-design-system`, `/skill-angular-di`, … | 13 |
| Playbook SDD — história → spec → tasks → homologação | `/foursys-plan-angular`, `/foursys-plan-node`, `/foursys-plan-spring`, … | 9 |
| Governança — constituição e regras do projeto | `/foursys-constitution`, `/foursys-constitution-angular`, `/foursys-constitution-node`, … | 4 |
| Java legado — discovery e análise de impacto | `/java-legado-discovery`, `/java-legado-docg-discovery`, `/java-legado-impact-analysis` | 3 |
| Disciplina de engenharia — TDD, review, gate de conclusão | `/skill-code-review`, `/skill-tdd`, `/skill-verificacao-pre-conclusao` | 3 |
| Documentação e diagramas | `/skill-diagrama-sequencia`, `/skill-mermaid-generator` | 2 |
| Manutenção deste catálogo | `/catalogo-foursys` | 1 |
| Skills gerais | `/skill-certificado-ssl-local` | 1 |

**Agentes** (trabalho end-to-end; skill é etapa pontual): `agente-angular-foursys`, `agente-spring-foursys`, `sdd-hub-foursys`.

## Regras automáticas

Carregam sozinhas quando o Claude toca em arquivo compatível — não precisa invocar:

| Regra | Aplica em |
|---|---|
| `angular-frontend` | `src/app/**/*.ts`, `**/*.component.ts`, `**/*.component.html`, `**/*.component.scss`, `**/*.directive.ts` |
| `angular-vertical-slice-arch` | `src/app/**/*.ts`, `**/*.component.ts`, `**/*.component.html`, `**/*.component.scss`, `**/*.directive.ts` |
| `prontidao-modernizacao-java` | `**/*.java` |
| `security-compliance` | **sempre ativa** |
| `solid-clean-code` | `**/*.{java,ts,js,kt,py}` |
| `springboot-hexagonal-arch` | `**/*.java`, `**/pom.xml`, `**/application.yml`, `**/application.properties` |
| `testing-patterns` | `**/*Test.java`, `**/*IT.java`, `**/*.spec.ts`, `**/*.test.ts` |

## Regras de uso

1. **Consulte a skill antes de gerar código** da stack: é ela que define os padrões obrigatórios.
2. **As rules carregam sozinhas** quando o Claude toca em arquivo compatível — não precisa citar.
3. **Abra a reference** listada em "References desta skill" quando a implementação exigir o
   detalhe (transações MongoDB, DLT Kafka, hexagonal com Feign). Elas não carregam sozinhas —
   é deliberado: custam contexto só quando abertas.
4. **Use o agente** quando a tarefa for feature completa end-to-end; a skill é etapa pontual.

## Manutenção deste catálogo

Tudo abaixo de `skills/`, `agents/` e `rules/` vem do hub Foursys e é
**sobrescrito** a cada publicação. Não edite esses arquivos à mão:

A documentação do próprio hub (os 12 `README.md` das pastas do catálogo) está em
`references/HUB/`, no mesmo caminho que tem lá. Não carrega sozinha: abra quando precisar
entender como a Foursys organiza o catálogo.

- para escolher as stacks desta máquina e publicar de novo: `/catalogo-foursys`;
- skill sua com o mesmo nome de uma do catálogo faz a publicação parar: dê outro nome à sua;
- rule de arquitetura fica **fora** do global de propósito: copie a do seu projeto para o
  `.claude/rules/` dele.

<!-- END CATALOGO GERADO -->
