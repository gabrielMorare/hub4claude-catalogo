# Complemento local — certificado Bradesco (ensc-lib-autogestao-certificadopub)

> Complemento às skills `/skill-springboot-certificado` e `/skill-springboot-certificado-impl`.
> Só traz o que o hub Foursys **não** cobre; o passo a passo completo está nas skills.
> Item que o hub passar a cobrir sai daqui.

| # | Item | Onde entra no hub | Enviado | Coberto |
|---|---|---|---|---|
| C1 | Um bundle por certificado distinto | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 3c e 3d | — | ❌ |
| C2 | Um bean e um handler de hot-reload por bundle | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → `*Config` e `Bundle*Config` de cada client | — | ❌ |
| C3 | Doc oficial do banco não documenta a chave da allow-list | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 4 | — | ❌ |
| C4 | Diagnóstico de projetos reais | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → Projeto modelo | — | ❌ |
| C5 | Apache HC5: `FeignNoSSLConfig` para chamadas sem SSL | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → FeignClient — Apache HC5 | — | ❌ |
| C6 | Dependências por client | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 1, "Dependências adicionais por client" | — | ❌ |
| C7 | Todo bean `RestTemplate`/`Client` nomeado, uma classe por bean | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → `RestTemplateConfig`, `FeignConfigSSL` | — | ❌ |
| C8 | Outros clients HTTP: consultar a engenharia de software | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 6 | — | ❌ |
| C9 | Caminho B: quem captura amplo demais e o exemplo correto | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → Adapter — Caminho B | — | ❌ |
| C10 | `application-cyber.yml` é interno da lib | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 3b | — | ❌ |
| C11 | `quiet-period` e `reload-on-update` não se alteram | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 3c | — | ❌ |
| C12 | Por que as exclusões do pom existem | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 1 | — | ❌ |
| C13 | O Caminho A só renova quando a causa é `SSLHandshakeException` | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → nota do topo e Adapter — Caminho A | — | ❌ |
| C14 | Evidência de bytecode da allow-list | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 4 | — | ❌ |
| C15 | Um Adapter só: `try/catch` inline, sem classe utilitária | `SKILL_SPRINGBOOT_CERTIFICADO_IMPL.md` → Adapter — Caminho B e RestClient | — | ❌ |
| C16 | Caminho A vale desde a `1.3.1`, não desde a `1.7.0` | `SKILL_SPRINGBOOT_CERTIFICADO.md` → Passo 0, item 5 | — | ❌ |

---

## C1 — Um bundle por certificado distinto

O `BradescoCorporateRootSHA2` atende **todos** os serviços internos Bradesco: um download e um bundle
cobrem todos eles. Um bundle a mais só é necessário quando o serviço alvo tem certificado
**específico**, fora dessa cadeia — é o caso da Sydel no `pedido-cartao`, que por isso tem dois.

Cada certificado distinto ganha o próprio servidor em `ssl-certificados` e o próprio bundle.

```yaml
spring:
  ssl:
    bundle:
      pem:
        sslBundle1:
          reload-on-update: true
          truststore:
            certificate: ${ssl-certificados.servidores.servidor-abc.caminho}${ssl-certificados.servidores.servidor-abc.nome}
        sslBundle2:
          reload-on-update: true
          truststore:
            certificate: ${ssl-certificados.servidores.servidor-xyz.caminho}${ssl-certificados.servidores.servidor-xyz.nome}

ssl-certificados:
  servidores:
    servidor-abc:
      dominio: "https://URL-DO-SERVICO-ABC"
      caminho: ${CERTIFICADO_CAMINHO:/home/jboss/cert-data/}
      nome: "ServicoAbc.crt"
      porta: 443
    servidor-xyz:
      dominio: "https://URL-DO-SERVICO-XYZ"
      caminho: ${CERTIFICADO_CAMINHO:/home/jboss/cert-data/}
      nome: "ServicoXyz.crt"
      porta: 443
```

## C2 — Um bean e um handler de hot-reload por bundle

O hub mostra só o `sslBundle1`. Com mais de um bundle (C1), cada um tem o seu bean nomeado e o seu
`addBundleUpdateHandler`, e o `template` da anotação (ou o servidor passado a `recarregar`) aponta
para o servidor daquela chamada.

```java
// WebClientConfig
@Bean("webClientXyz")
public WebClient createWebClientXyz(WebClientSsl ssl) {
    return WebClient.builder().apply(ssl.fromBundle("sslBundle2")).build();
}

// BundleWebClientConfig.initWebClient()
sslBundles.addBundleUpdateHandler("sslBundle2", bundle -> {
    client.compute("webClientXyz", (k, v) -> new WebClientConfig().createWebClientXyz(ssl));
    estadoInstance.setAtualizarCertificado(Boolean.TRUE);
});
```

No Feign, é uma `FeignConfigSSL` por bundle, porque a lib exige exatamente um `@Bean` por classe de
`configuration =`.

## C3 — Doc oficial do banco não documenta a chave da allow-list

`doc_projeto/lib_certificados_publico_spring_boot_3x.md` não cita `allow-list.seguranca` nem
`certificado-projeto.identidade`; só diz que a allow-list é "gerida internamente pelo time de
Segurança". O mecanismo real é `@ConfigurationProperties` (C14). Em divergência, vale o jar.

## C4 — Diagnóstico de projetos reais

Confirme a versão da lib no `pom.xml` do projeto antes de copiar qualquer coisa dele.

| Projeto | Lib | Situação |
|---|---|---|
| `ccpf-bff-compra-moeda` | `1.1.7` | `certificado-projeto.identidade`: correto para a versão. Caminho B. Modelo válido só de `RestTemplateConfig`/`SSLBundleConfig` |
| `ccpf-bff-mya-cartoes` | `1.7.0` | `certificado-projeto.identidade`: **chave stale**, não casa com nenhuma `@ConfigurationProperties` do jar; herdada por cópia |
| `ccpf-srv-mya-pedido-cartao-refactor` | `1.5.2` | sem `application-cert.yml` no repo: allow-list vazia se a lib baixar ao vivo |
| `ccpf-srv-mya-ativacao-cartao-refactor` | `1.7.0` | FeignClient + OkHttp, Caminho A. Origem de "Feign: exigências ocultas" e da nota de `application-{profile}.yml`; detalhe em `docs/output/plano_implementacao_certificado_ssl_antifraude.md`, seção 10 |

Arquivos do modelo `ccpf-bff-compra-moeda`:

- `src/main/java/br/com/bradesco/cmbio/compramoeda/config/RestTemplateConfig.java`
- `src/main/java/br/com/bradesco/cmbio/compramoeda/config/certificado/SSLBundleConfig.java`
- `src/main/resources/application.yml`
- `src/main/resources/application-cert.yml` — não copiar: chave de lib `<= 1.1.7`

## C5 — Apache HC5: `FeignNoSSLConfig` para chamadas sem SSL

O hub traz o bean sem SSL para Client Default e OkHttp; para HC5, não.

```java
@Configuration
public class FeignNoSSLConfig {
    @Bean("feignClient")
    public Client createClient(CloseableHttpClient httpClient5) {
        return new ApacheHttp5Client(httpClient5);
    }
}
```

## C6 — Dependências por client

- **RestTemplate:** `httpclient5` só se usar `HttpComponentsClientHttpRequestFactory`; versão
  gerenciada pelo Spring Boot. Sem ele, nenhuma dependência adicional.
- **Feign (qualquer variante):** a versão do `spring-cloud-starter-openfeign` vem do
  `spring-cloud-dependencies` — conferir que ele está no `dependencyManagement`. `feign-okhttp` e
  `feign-hc5` herdam a versão do starter.

## C7 — Todo bean `RestTemplate`/`Client` nomeado, uma classe por bean

O hub exige nome e um `@Bean` por classe só nas classes de `configuration =` do Feign. Com esta lib,
vale para todo bean que retorna `RestTemplate` ou `Client`: `@Bean("nome")`, uma classe por bean.

## C8 — Outros clients HTTP

Clients fora da tabela do Passo 0 (RestTemplate, Feign Default/OkHttp/HC5, WebClient, RestClient):
consultar a equipe de engenharia de software antes de usar a lib.

## C9 — Caminho B: quem captura amplo demais e o exemplo correto

- **Não copiar:** `ccpf-bff-compra-moeda` e `ccpf-srv-mya-pedido-cartao` capturam a exceção de forma
  ampla e acionam a renovação até em erro de negócio.
- **Copiar:** `ccpf-bff-mya-cartoes`, `LimiteCartaoRestClient` — guard
  `if (!(e instanceof HttpStatusCodeException))`, coberto por teste.

## C10 — `application-cyber.yml` é interno da lib

Entra em `spring.config.import` (`optional:classpath:/application-cyber.yml`), mas **não se cria** no
projeto: é de uso interno da lib.

## C11 — `quiet-period` e `reload-on-update` não se alteram

`spring.ssl.bundle.watch.file.quiet-period: 500` e `reload-on-update: true` em cada bundle ficam
como estão. A única exceção é o erro "cert baixado mas SSL ainda falha", em que o hub manda aumentar
o `quiet-period`.

## C12 — Por que as exclusões do pom existem

`spring-security-crypto` e `bcprov`/`bcpkix`/`bcutil-jdk18on` saem da lib para não conflitar com as
versões gerenciadas pelo Spring Boot. Não remover as exclusões.

## C13 — O Caminho A só renova quando a causa é `SSLHandshakeException`

Conferido com `javap` no jar `1.7.0`. `AspectoTramentoCertificadoPublicoService.handlerException`
(`@AfterThrowing`) só chama `recarregar` se `VerficacaoExceptionService.verificarCausa(ex)` devolver
`true`:

- `ex.getCause()` é `SSLHandshakeException` → renova;
- `ex.getCause().getCause()` é `SSLHandshakeException` → renova;
- qualquer outro caso → não renova. Inclui `SSLHandshakeException` lançada **sem embrulho** e erro de
  negócio (4xx/5xx).

Por isso o Caminho A não precisa separar erro de negócio de erro técnico. Não verificado para
`@HandleReactiveInvalidPublicCertificate`: o aspecto reativo (`@Around`) delega o filtro a
`ReactiveRenewalCertificateService.renewCertificate`.

## C14 — Evidência de bytecode da allow-list

Conferido com `javap` nos jars `1.1.7`, `1.3.1`, `1.5.2` e `1.7.0`:

- `DownloadCertificadoPublicoServiceImpl.downloadCertificado(...)` lança `CertificateIssuerNotValid`
  quando `ehEmissorPermitido(emissor)` é `false`.
- `DownloadInicialCertificadoPublico.iniciarDownload` checa `Files.exists` antes de baixar: com o
  `.crt` já no `caminho`, a validação não roda.
- `IdentidadeCertificadoSegurancaProperties` (`allow-list.seguranca`) já existe na `1.1.7`, mas só
  passa a ser injetada quando `IdentidadeCertificadoPublicoProperties` sai do jar, na `1.3.1`.
- Versão entre `1.1.7` e `1.3.1` não foi inspecionada: rodar `javap` no jar dela antes de escolher a
  chave.

## C15 — Um Adapter só: `try/catch` inline, sem classe utilitária

Com um único Adapter, o `try/catch` (ou o `if`/`recarregar` do RestClient) fica inline. Extrair só
quando houver mais de um Adapter repetindo, e só a chamada de `recarregar()`.

## C16 — Caminho A vale desde a `1.3.1`

O hub manda usar a anotação só a partir da `1.7.0`. O jar diz outra coisa: `unzip -l` mostra
`HandleInvalidPublicCertificate`, `HandleReactiveInvalidPublicCertificate` e os dois aspectos nos
jars `1.3.1`, `1.5.2` e `1.7.0`. Na `1.1.7` há só `AspectoCertificadoService`, sem anotação.

Na `1.3.1`, `AspectoTramentoCertificadoPublicoService` é `@Aspect` + `@Component` no pacote
`br.com.bradesco.lib.autogestao` — ou seja, o `@ComponentScan(basePackages =
"br.com.bradesco.lib.autogestao")` que as versões `< 1.7.0` já exigem registra o aspecto. O
filtro por `SSLHandshakeException` (C13) também já está lá.

**Regra:** da `1.3.1` em diante, Caminho A (anotação). Só na `1.1.7` e anteriores o Caminho B é
obrigatório. O corte `1.7.0` da skill do hub é a chegada de `@EnableAutoGestaoCertificado`, que
muda como a lib é ativada — não a disponibilidade da anotação.
