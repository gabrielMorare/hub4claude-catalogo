---
name: skill-springboot-log-negocio
description: Implementa o Log de Negócio (SrvCanal / LogCloud) em endpoints Spring Boot. Use quando precisar registrar eventos de transação de negócio para auditoria e rastreabilidade via Kafka/Databricks no padrão Bradesco LEAP.
metadata:
  version: "1.0.0"
---

# Skill: Log de Negócio — LogCloud SrvCanal

Este skill implementa o Log de Negócio usando a lib `enge-lib-logcloud-spring-starter` em qualquer microsserviço Spring Boot no ecossistema Bradesco LEAP.

> **Fonte oficial**: documentação corporativa `[IngLog] - Log de Aplicações Leap - Java - FluentBIT`

---

## Como usar este skill

1. Leia as **4 perguntas da Etapa 0** completamente.
2. Responda cada uma — se não souber, diga explicitamente.
3. O skill gera o código com `TODO` onde a informação não foi fornecida.
4. Ao final, verifique o **Checklist** e resolva os TODOs com os times responsáveis.

---

## Etapa 0 — Levantamento de Contexto (OBRIGATÓRIO)

Antes de gerar qualquer código, preciso entender o seu projeto. **Responda todas as perguntas abaixo.**

---

### Pergunta 1 — Contexto do projeto

**a) Qual é o package base do seu projeto Java?**
> Exemplo: `br.com.bradesco.minha.aplicacao`

**b) A lib `enge-lib-logcloud-spring-starter` já está no seu `pom.xml`? Se sim, qual é a versão atual?**
> A versão oficial recomendada pela documentação corporativa é **`4.5.4`** — o Artefato 1 assume essa versão diretamente.
> ⚠️ Se estiver na **`4.3.0`**, atualize imediatamente — essa versão possui um bug crítico no layout dos logs de negócio e é explicitamente proibida.

**c) `@EnableLogCloud` já está na classe `Application.java`?**
> Se não souber: `grep -rn "EnableLogCloud" src/`

**d) Seu projeto já tem a seção `srvcanal.log` no `application.yml`?**
> Se não souber: `grep -A5 "srvcanal" src/main/resources/application.yml`

---

### Pergunta 2 — Endpoint(s) alvo

**Para qual(is) endpoint(s) você quer adicionar o Log de Negócio?**

Informe:
- Nome do Controller (classe Java)
- Método HTTP e path de cada endpoint
- Tipo do DTO de request de cada endpoint

> **Nota**: Log de Negócio faz mais sentido em operações de **escrita** (POST/PUT) que alteram estado no sistema. Para GET, use somente se houver requisito explícito de auditoria de leitura.

Exemplo de resposta:
```
- PagamentoController
  - POST /api/pagamentos → PagamentoRequestDTO
  - PUT /api/pagamentos/{id}/cancelar → CancelamentoRequestDTO
```

---

### Pergunta 3 — Código(s) de Transação (`CODIGO_TRANSACAO`)

O `CODIGO_TRANSACAO` é um **identificador único** que identifica esta transação no sistema de logs corporativo do Bradesco. Ele é definido pelo time de arquitetura em alinhamento com os times de dados.

**Você já tem o(s) código(s) de transação definidos para cada endpoint?**

- Se **sim**: informe o valor exato para cada endpoint.
- Se **não**: o skill vai sugerir um nome baseado no padrão observado e marcá-lo com `TODO` para confirmação posterior.

**Padrão de nomenclatura utilizado no ecossistema Bradesco:**
```
CCPF_BFF_MYA_CARTOES_EFETIVA_CL
  ↑    ↑       ↑         ↑     ↑
domínio tipo  nome_app  ação  canal
```
Estrutura: `{DOMINIO}_{TIPO_APP}_{NOME_APP}_{ACAO}_{CANAL}`

---

### Pergunta 4 — Campos do `Entrada.java`

O `Entrada.java` é o DTO que captura os dados de negócio relevantes para auditoria. Você decide quais campos registrar.

**Para cada endpoint alvo, informe:**

1. **Quais campos do request são relevantes para auditoria?** Liste nome e tipo.
2. **Algum dado de resposta (saída) também precisa ser registrado?**

**Regras obrigatórias (LGPD e Segurança):**
- ❌ Nunca incluir: CPF, senha, token JWE, número PAN completo de cartão, dados bancários completos
- ✅ Podem ser incluídos: IDs internos de sistema, valores de operação (limites, valores monetários), códigos de produto, flags de status, timestamps

Se não souber quais campos incluir, o skill cria um `Entrada.java` mínimo com campos de exemplo e `TODO` para o dev completar.

---

## Implementação — Geração dos Artefatos

> Execute após responder as 4 perguntas acima. Os artefatos abaixo são templates — o skill os customiza com base nas suas respostas.

---

### Artefato 1 — `pom.xml`

**Adicionar ou atualizar para a versão `4.5.4`** (versão recomendada pela documentação corporativa):

```xml
<properties>
    <!-- Versão oficial recomendada pela documentação corporativa              -->
    <!-- ⚠️ PROIBIDA: 4.3.0 — bug crítico no layout dos logs de negócio        -->
    <bradesco.enge.logcloud.version>4.5.4</bradesco.enge.logcloud.version>
</properties>

<dependencies>
    <dependency>
        <groupId>br.com.bradesco.escea.logcloud</groupId>
        <artifactId>enge-lib-logcloud-spring-starter</artifactId>
        <version>${bradesco.enge.logcloud.version}</version>
        <exclusions>
            <exclusion><groupId>org.springframework</groupId><artifactId>spring-core</artifactId></exclusion>
            <exclusion><groupId>org.springframework</groupId><artifactId>spring-web</artifactId></exclusion>
            <exclusion><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId></exclusion>
            <exclusion><groupId>org.springframework</groupId><artifactId>spring-beans</artifactId></exclusion>
        </exclusions>
    </dependency>

    <!-- Provider de dados de autenticação (necessário para @EnableAuthorizationDataProvider) -->
    <dependency>
        <groupId>br.com.bradesco.enge.logcloud</groupId>
        <artifactId>enge-lib-auth-data-provider-spring</artifactId>
        <version>2.0.5</version>
    </dependency>
</dependencies>
```

Adicionar ao `sonar.coverage.exclusions` (Entrada é DTO sem lógica):
```xml
**/domain/log/Entrada.java,
```

---

### Artefato 2 — `Application.java`

Adicionar as duas annotations se ainda não estiverem presentes:

```java
package {package.base};

import br.com.bradesco.enge.logcloud.logback.authorization.EnableAuthorizationDataProvider;
import br.com.bradesco.enge.logcloud.spring.EnableLogCloud;
// ... demais imports e annotations do seu projeto

@SpringBootApplication
@EnableLogCloud                    // garante infraestrutura de log cloud
@EnableAuthorizationDataProvider   // injeta dados do usuário autenticado no log
// ... demais annotations do seu projeto (manter as existentes)
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

> `@EnableLogCloud` e `@EnableAuthorizationDataProvider` devem **coexistir** com outras annotations do projeto (`@EnableAutoGestaoCertificado`, `@EnableFeignClients`, etc.).

---

### Artefato 3 — `application.yml`

Adicionar o bloco caso ainda não exista:

```yaml
bradesco:
  enge:
    logcloud:
      # Log Técnico — SLF4J (logger.info, logger.error, etc.)
      tecnico.log:
        level: ${LOG_LEVEL:INFO}
        console:
          enabled: ${LOG_TECNICO_CONSOLE_ENABLED:true}   # true local | false HOM/PRD
          pretty: ${LOG_TECNICO_CONSOLE_PRETTY:false}
        tcp:
          enabled: ${LOG_TECNICO_TCP_ENABLED:false}       # false local | true HOM/PRD

      # Log de Negócio — SrvCanalLogger
      srvcanal.log:
        level: ${LOG_SRVCANAL_LEVEL:INFO}
        console:
          enabled: ${LOG_SRVCANAL_CONSOLE_ENABLED:true}   # true local | false HOM/PRD
        tcp:
          enabled: ${LOG_SRVCANAL_TCP_ENABLED:false}       # false local | true HOM/PRD
```

> Se o projeto já tiver o bloco `bradesco.enge.logcloud`, apenas verificar se `srvcanal.log` está presente.

---

### Artefato 4 — `values.yaml` (repositório config)

No repositório `-config` do projeto, adicionar/atualizar:

```yaml
global:
  fluentbit:
    enabled: true              # habilitar o sidecar FluentBIT no pod
    metodo: "tcp"              # comunicação TCP entre app e sidecar
    kafka_topic: "TODO_KAFKA_TOPIC_{SEU_DOMINIO}"  # TODO: obter com time de infra
    log_path: "/var/log/app"
    customResource:            # recursos do container FluentBIT (não compartilha com o app)
      enabled: true
      resources:
        requests:
          cpu: "150m"
          memory: "100M"
        limits:
          cpu: "300m"
          memory: "400M"

  configmap:
    LOG_LEVEL: "INFO"
    LOG_TECNICO_CONSOLE_ENABLED: "false"   # false em HOM/PRD (evita duplicação no Elastic)
    LOG_TECNICO_CONSOLE_PRETTY: "false"
    LOG_TECNICO_TCP_ENABLED: "true"        # true em HOM/PRD (envia ao FluentBIT)
    LOG_SRVCANAL_LEVEL: "INFO"
    LOG_SRVCANAL_CONSOLE_ENABLED: "false"  # false em HOM/PRD
    LOG_SRVCANAL_TCP_ENABLED: "true"       # true em HOM/PRD
```

> **`kafka_topic`** é fornecido pelo time de infra/plataforma que gerencia o Kafka do domínio. Exemplo do projeto referência (domínio `transc`): `"transc-hom-log-negocio-predominio"`.

---

### Artefato 5 — `Entrada.java`

**Local**: `src/main/java/{package.base}/domain/log/Entrada.java`

O skill gera com os campos informados na Pergunta 4. Template base — substituir pelos campos reais:

```java
package {package.base}.domain.log;

import java.math.BigDecimal;

public class Entrada {

    // TODO: substituir pelos campos reais da sua transação (sem PII)
    private String identificadorOperacao;
    private BigDecimal valorOperacao;
    private String statusOperacao;

    // Construtor padrão OBRIGATÓRIO — usado por ThreadLocal.withInitial(Entrada::new)
    public Entrada() {}

    public String getIdentificadorOperacao() { return identificadorOperacao; }
    public void setIdentificadorOperacao(String identificadorOperacao) {
        this.identificadorOperacao = identificadorOperacao;
    }

    public BigDecimal getValorOperacao() { return valorOperacao; }
    public void setValorOperacao(BigDecimal valorOperacao) {
        this.valorOperacao = valorOperacao;
    }

    public String getStatusOperacao() { return statusOperacao; }
    public void setStatusOperacao(String statusOperacao) {
        this.statusOperacao = statusOperacao;
    }
}
```

---

### Artefato 6 — `LogNegocio.java`

**Local**: `src/main/java/{package.base}/domain/log/LogNegocio.java`

O skill ajusta o tipo do parâmetro de `setEntrada` e o mapeamento de campos com base na Pergunta 2 e 4:

```java
package {package.base}.domain.log;

import br.com.bradesco.enge.logcloud.api.SrvCanalLoggerFactory;
import br.com.bradesco.enge.logcloud.canal.ReturnCode;
import br.com.bradesco.enge.logcloud.canal.SrvCanalLog;
import br.com.bradesco.enge.logcloud.canal.SrvCanalLogger;
import io.micrometer.common.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LogNegocio {

    // TODO: confirmar com o time de arquitetura
    // Padrão: {DOMINIO}_{TIPO_APP}_{NOME_APP}_{ACAO}_{CANAL}
    // Exemplo: "CCPF_BFF_MYA_CARTOES_EFETIVA_CL"
    private static final String CODIGO_TRANSACAO = "TODO_DEFINIR_COM_ARQUITETURA";

    private static final Logger LOGGER = LoggerFactory.getLogger(LogNegocio.class);

    // ThreadLocal: cada thread (request HTTP) tem seu próprio Entrada — necessário para concorrência
    private static final ThreadLocal<Entrada> entradaThreadLocal = ThreadLocal.withInitial(Entrada::new);

    /**
     * Captura os dados do request e armazena no buffer da thread atual.
     * Chamar ANTES de qualquer lógica de negócio no Controller.
     */
    public void setEntrada(SeuRequestDTO request) {  // TODO: substituir SeuRequestDTO pelo DTO real
        try {
            Entrada entrada = this.getEntrada();

            // TODO: mapear os campos do request para a Entrada conforme definido no Artefato 5
            // entrada.setIdentificadorOperacao(request.getId());
            // entrada.setValorOperacao(request.getValor());

            entradaThreadLocal.set(entrada);
        } catch (Exception e) {
            LOGGER.error("Erro ao gravar dados de entrada do log de negócio: {}", e.getMessage());
        }
    }

    /**
     * Envia o log ao FluentBIT e limpa o buffer da thread.
     * Chamar em TODA saída do endpoint — sucesso e todos os caminhos de erro.
     */
    public void logar(ReturnCode returnCode, String message) {
        Entrada entrada = entradaThreadLocal.get();
        SrvCanalLogger srvCanalLogger = SrvCanalLoggerFactory.getLogger(LogNegocio.class);
        srvCanalLogger.log(
                SrvCanalLog
                        .builder(returnCode)
                        .entrada(List.of(entrada))
                        .codigoTransacao(CODIGO_TRANSACAO)
                        .addMensagem("message", StringUtils.isEmpty(message) ? "SEM_MENSAGEM" : message)
                        .build());
        limpar();
    }

    /** Remove o Entrada da thread — obrigatório para evitar memory leak. */
    public void limpar() {
        entradaThreadLocal.remove();
    }

    public Entrada getEntrada() {
        return entradaThreadLocal.get();
    }
}
```

---

### Artefato 7 — Controller (atualização)

O skill adiciona `LogNegocio` ao controller informado na Pergunta 2, seguindo o padrão dos 3 pontos de chamada:

```java
import br.com.bradesco.enge.logcloud.canal.ReturnCode;
import {package.base}.domain.log.LogNegocio;

@RestController
@RequestMapping("/api/seu-recurso")
public class SeuController {

    private final LogNegocio logNegocio;       // ADICIONAR campo
    private final SeuInputPort seuUseCase;
    // ... demais dependências

    // ADICIONAR logNegocio no construtor (ou via @AllArgsConstructor se o projeto usa Lombok)
    public SeuController(LogNegocio logNegocio, SeuInputPort seuUseCase) {
        this.logNegocio = logNegocio;
        this.seuUseCase = seuUseCase;
    }

    @PostMapping
    public ResponseEntity<SeuResponseDTO> executar(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @Valid @RequestBody SeuRequestDTO request) {

        // PONTO 1 — captura dados de entrada no início do fluxo
        logNegocio.setEntrada(request);

        try {
            // ... validações e lógica existente do endpoint ...

            var resultado = seuUseCase.executar(request, authorization);

            // PONTO 2 — loga SUCESSO ao final do caminho feliz
            logNegocio.logar(ReturnCode.SUCESSO, null);
            return ResponseEntity.ok(resultado);

        } catch (SuaException e) {
            // PONTO 3 — loga ERRO_GRAVE em CADA saída de erro (catch ou condição de negócio)
            logNegocio.logar(ReturnCode.ERRO_GRAVE,
                    "Descricao do erro para auditoria: " + e.getMessage());
            throw e;
        }
    }
}
```

**Regra crítica**: Todo caminho de saída do método (return ou throw) deve chamar `logNegocio.logar()`. Se um caminho de erro não chamar, o `ThreadLocal` fica com dados da transação anterior, causando **memory leak e dados incorretos no log**.

---

### Artefato 8 — `LogNegocioTest.java`

**Local**: `src/test/java/{package.base}/domain/log/LogNegocioTest.java`

Teste unitário puro — sem Spring context, instanciado com `new LogNegocio()`. O método `logar` usa `MockedStatic` porque o `SrvCanalLoggerFactory` é invocado de forma estática.

```java
package {package.base}.domain.log;

import br.com.bradesco.enge.logcloud.api.SrvCanalLoggerFactory;
import br.com.bradesco.enge.logcloud.canal.ReturnCode;
import br.com.bradesco.enge.logcloud.canal.SrvCanalLog;
import br.com.bradesco.enge.logcloud.canal.SrvCanalLogger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LogNegocioTest {

    private LogNegocio logNegocio;

    @BeforeEach
    void setUp() {
        logNegocio = new LogNegocio();
    }

    // =========================================================================
    // setEntrada
    // =========================================================================
    @Nested
    @DisplayName("setEntrada")
    class SetEntrada {

        @Test
        @DisplayName("Dado request válido, Quando setEntrada, Então popula Entrada corretamente")
        void dadoRequestValido_quandoSetEntrada_entaoPopulaEntradaCorretamente() {
            // Given
            SeuRequestDTO request = criarRequestValido();

            // When
            logNegocio.setEntrada(request);

            // Then
            Entrada entrada = logNegocio.getEntrada();
            // TODO: verificar cada campo mapeado conforme o seu setEntrada
            // assertEquals("valor-esperado", entrada.getCampoTexto());
            // assertEquals(new BigDecimal("100.00"), entrada.getValorMonetario());
            assertNotNull(entrada);
        }

        @Test
        @DisplayName("Dado request nulo, Quando setEntrada, Então não lança exceção")
        void dadoRequestNulo_quandoSetEntrada_entaoNaoLancaExcecao() {
            // Given / When / Then
            assertDoesNotThrow(() -> logNegocio.setEntrada(null));
        }
    }

    // =========================================================================
    // logar
    // =========================================================================
    @Nested
    @DisplayName("logar")
    class Logar {

        @Test
        @DisplayName("Dado ReturnCode SUCESSO e mensagem nula, Quando logar, Então invoca SrvCanalLogger com SEM_MENSAGEM")
        void dadoSucessoEMensagemNula_quandoLogar_entaoInvocaLoggerComSemMensagem() {
            // Given
            logNegocio.setEntrada(criarRequestValido());
            SrvCanalLogger mockLogger = mock(SrvCanalLogger.class);

            try (MockedStatic<SrvCanalLoggerFactory> factory = mockStatic(SrvCanalLoggerFactory.class)) {
                factory.when(() -> SrvCanalLoggerFactory.getLogger(LogNegocio.class))
                       .thenReturn(mockLogger);

                // When
                logNegocio.logar(ReturnCode.SUCESSO, null);

                // Then
                verify(mockLogger).log(any(SrvCanalLog.class));
            }
        }

        @Test
        @DisplayName("Dado ReturnCode SUCESSO e mensagem vazia, Quando logar, Então invoca SrvCanalLogger")
        void dadoSucessoEMensagemVazia_quandoLogar_entaoInvocaLogger() {
            logNegocio.setEntrada(criarRequestValido());
            SrvCanalLogger mockLogger = mock(SrvCanalLogger.class);

            try (MockedStatic<SrvCanalLoggerFactory> factory = mockStatic(SrvCanalLoggerFactory.class)) {
                factory.when(() -> SrvCanalLoggerFactory.getLogger(LogNegocio.class))
                       .thenReturn(mockLogger);

                logNegocio.logar(ReturnCode.SUCESSO, "");

                verify(mockLogger).log(any(SrvCanalLog.class));
            }
        }

        @Test
        @DisplayName("Dado ReturnCode ERRO_GRAVE e mensagem real, Quando logar, Então invoca SrvCanalLogger")
        void dadoErroGraveEMensagemReal_quandoLogar_entaoInvocaLogger() {
            logNegocio.setEntrada(criarRequestValido());
            SrvCanalLogger mockLogger = mock(SrvCanalLogger.class);

            try (MockedStatic<SrvCanalLoggerFactory> factory = mockStatic(SrvCanalLoggerFactory.class)) {
                factory.when(() -> SrvCanalLoggerFactory.getLogger(LogNegocio.class))
                       .thenReturn(mockLogger);

                logNegocio.logar(ReturnCode.ERRO_GRAVE, "Falha ao processar operacao");

                verify(mockLogger).log(any(SrvCanalLog.class));
            }
        }
    }

    // =========================================================================
    // limpar
    // =========================================================================
    @Nested
    @DisplayName("limpar")
    class Limpar {

        @Test
        @DisplayName("Dado Entrada populada, Quando limpar, Então ThreadLocal é resetado")
        void dadoEntradaPopulada_quandoLimpar_entaoThreadLocalEhResetado() {
            // Given
            logNegocio.setEntrada(criarRequestValido());
            // Confirma que foi populada (substitua pelo campo real do seu Entrada)
            // assertNotNull(logNegocio.getEntrada().getCampoTexto());

            // When
            logNegocio.limpar();

            // Then — após limpar, nova instância de Entrada é criada pelo ThreadLocal.withInitial
            Entrada entradaAposLimpar = logNegocio.getEntrada();
            assertNotNull(entradaAposLimpar);
            // assertNull(entradaAposLimpar.getCampoTexto()); // campos voltam ao null (default Java)
        }
    }

    // =========================================================================
    // Helpers — substituir pelos builders/construtores do seu projeto
    // =========================================================================

    private SeuRequestDTO criarRequestValido() {
        // TODO: construir um request com todos os campos preenchidos
        // return new SeuRequestDTO(campo1, campo2, ...);
        return new SeuRequestDTO();
    }

}

```

> **Por que `MockedStatic`?** O `SrvCanalLoggerFactory.getLogger()` é um método estático. O Mockito precisa do `mockStatic` para interceptar chamadas estáticas. A dependência `mockito-inline` (ou `mockito-core >= 4.x`) já suporta isso sem configuração extra.

> **Cobertura esperada**: os cenários de `setEntrada` (válido + null), `logar` (SUCESSO, ERRO_GRAVE, mensagem vazia) e `limpar` são suficientes para atingir cobertura > 90% no `LogNegocio`. Adapte os comentários `TODO` para os campos reais do seu `Entrada`.

---

## Múltiplos Endpoints — Um ou Vários `LogNegocio`?

| Situação | Abordagem |
|---|---|
| Endpoints do mesmo controller com `CODIGO_TRANSACAO` **diferente** | Criar uma classe `LogNegocio` por operação (`LogNegocioAdicionar.java`, `LogNegocioAlterar.java`) ou parametrizar o código via construtor |
| Todos os endpoints com o **mesmo** `CODIGO_TRANSACAO` | Uma única classe `LogNegocio.java` com um único `setEntrada` |
| Campos de `Entrada` diferentes por endpoint | `Entrada` pode ter campos opcionais (default `null`) ou criar uma `Entrada` por operação |

---

## Projeto de Referência

A implementação completa e aprovada em produção está no projeto `ccpf-bff-compra-moeda`:

| Arquivo | O que mostra |
|---|---|
| `domain/log/Entrada.java` | DTO de log com campos financeiros da transação |
| `domain/log/LogNegocio.java` | `@Service` com ThreadLocal, setEntrada, logar, limpar |
| `Application.java` | `@EnableLogCloud` + `@EnableAuthorizationDataProvider` |
| `values.yaml` (config repo) | `fluentbit.kafka_topic`, `metodo: tcp`, `customResource` |
| `EfetivacaoController.java` | Os 3 pontos de chamada no Controller (setEntrada + 2x logar) |

---

## Checklist Final

### Infra (1-time por projeto)
- [ ] `pom.xml`: `enge-lib-logcloud-spring-starter` >= 4.5.4 (verificar se não é 4.3.0)
- [ ] `pom.xml`: `enge-lib-auth-data-provider-spring` >= 2.0.5 presente
- [ ] `pom.xml`: `**/domain/log/Entrada.java` adicionado ao `sonar.coverage.exclusions`
- [ ] `Application.java`: `@EnableLogCloud` presente
- [ ] `Application.java`: `@EnableAuthorizationDataProvider` presente
- [ ] `application.yml`: bloco `srvcanal.log` configurado com variáveis de ambiente
- [ ] `values.yaml` (config repo): `fluentbit.enabled: true`, `metodo: tcp`, `customResource`
- [ ] `values.yaml` (config repo): `LOG_TECNICO_TCP_ENABLED: "true"`, `LOG_SRVCANAL_TCP_ENABLED: "true"`
- [ ] `values.yaml` (config repo): `LOG_TECNICO_CONSOLE_ENABLED: "false"` (evita duplicação no Elastic)

### Por endpoint/transação
- [ ] `domain/log/Entrada.java` criado com os campos corretos (sem PII/CPF/senha/token)
- [ ] `domain/log/LogNegocio.java` criado com `CODIGO_TRANSACAO` (ou TODO marcado)
- [ ] Controller: `LogNegocio` injetado
- [ ] Controller: `setEntrada(request)` chamado antes da lógica de negócio
- [ ] Controller: `logar(SUCESSO, null)` chamado em todo caminho feliz
- [ ] Controller: `logar(ERRO_GRAVE, mensagem)` chamado em todo caminho de erro
- [ ] `LogNegocioTest.java` criado com TODOs dos campos reais preenchidos
- [ ] Testes cobrem: `setEntrada` (válido, null), `logar` (SUCESSO, ERRO_GRAVE, vazio), `limpar`
- [ ] Testado localmente: log de negócio aparece no console ao chamar o endpoint

### TODOs externos (dependem de outros times)
- [ ] **`CODIGO_TRANSACAO`** — confirmar com time de arquitetura antes de subir para HOM
- [ ] **`kafka_topic`** — obter com time de infra/plataforma do seu domínio antes de subir para HOM

---

## Verificar TODOs após implementação

```bash
# Localizar TODOs pendentes nos arquivos de log
grep -rn "TODO" src/main/java/*/domain/log/

# Verificar kafka_topic no config repo
grep -n "kafka_topic" values.yaml
```