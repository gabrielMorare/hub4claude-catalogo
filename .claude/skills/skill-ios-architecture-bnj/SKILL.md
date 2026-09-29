---
name: skill-ios-architecture-bnj
description: "Skill de arquitetura completa para projetos BNJ (BancoNext Journey / Bradesco iOS). Cobre todas as camadas: Data (DTO + Repository + BNSCommunication), Domain (Model + Interface + UseCase), Presentation (Analytics + ViewData + ViewModel + View/Screen + ViewController) e Router (RouterInterface + RouterManager + JourneyRoute + Launcher). Use como referência principal ao criar qualquer feature no projeto BNJ iOS."
metadata:
  version: "0.1.0"
---


# iOS Architecture BNJ — Arquitetura Completa por Camadas

Arquitetura do projeto BNJ (BancoNext Journey). Usa JourneyCore como framework base, UIKit + SwiftUI híbrido e Liquid Design System.

## Visão Geral das Camadas

```
Public/
  ├─ BNJ{Nome}Launcher.swift          ← entrada do módulo
  ├─ BNJ{Nome}LauncherProtocol.swift
  ├─ BNJ{Nome}Dependencies.swift
  ├─ BNJ{Nome}JourneyRoute.swift
  └─ BNJ{Nome}JourneyRouterDelegate.swift

Router/
  ├─ MainRouterManager.swift          ← implementa RouterManagerInterface + todos RouterInterfaces
  └─ {SubFluxo}RouterManager.swift   ← herda MainRouterManager

Presentation/
  ├─ Analytics/
  │   ├─ {Feature}AnalyticsInterface.swift
  │   └─ {Feature}Analytics.swift
  ├─ View/
  │   ├─ {Feature}Screen.swift        ← SwiftUI (@MainActor, BaseScreen)
  │   ├─ {Feature}View.swift          ← UIKit (LiquidView)
  │   ├─ {Feature}ViewController.swift
  │   ├─ {Feature}ViewData.swift
  │   ├─ {Feature}RouterInterface.swift
  │   ├─ Shared/
  │   │   └─ Modifiers/               ← ViewModifiers reutilizáveis
  │   └─ Custom/
  │       ├─ {Feature}LoadingView.swift
  │       ├─ {Feature}SuccessView.swift
  │       ├─ {Feature}EmptyView.swift
  │       └─ {Feature}ErrorView.swift (ou ErrorView genérico)
  └─ ViewModel/
      └─ {Feature}ViewModel.swift

Domain/
  ├─ {Feature}Model.swift
  ├─ {Feature}RepositoryInterface.swift
  ├─ {Feature}UseCaseInterface.swift
  ├─ {Feature}UseCase.swift
  ├─ InMemoryRepositoryInterface.swift
  └─ InMemoryRepository.swift (na camada Data)

Data/
  ├─ {Feature}DTO.swift
  ├─ {Feature}Repository.swift
  └─ InMemoryRepository.swift

Resources/
  ├─ Localizable.strings
  └─ Assets.xcassets

Utils/
  └─ Extensions/
```

## Nomenclaturas por tipo (obrigatórias)

| Tipo | Padrão | Exemplo |
|---|---|---|
| DTO | `<Nome>DTO` | `ContactDTO`, `KeysDTO` |
| Model | `<Nome>Model` | `ContactModel`, `KeysModel` |
| Repository | `<Nome>Repository` | `ContactsRepository` |
| RepositoryInterface | `<Nome>RepositoryInterface` | `ContactsRepositoryInterface` |
| UseCase | `<Nome>UseCase` | `ContactsUseCase` |
| UseCaseInterface | `<Nome>UseCaseInterface` | `ContactsUseCaseInterface` |
| ViewModel | `<Nome>ViewModel` | `ContactViewModel` |
| ViewData | `<Nome>ViewData` | `ContactsViewData` |
| Analytics | `<Nome>Analytics` | `ContactsAnalytics` |
| AnalyticsInterface | `<Nome>AnalyticsInterface` | `ContactsAnalyticsInterface` |
| Screen (SwiftUI) | `<Nome>Screen` | `MyLimitsScreen` |
| View (UIKit) | `<Nome>View` | `KeysView` |
| ViewController | `<Nome>ViewController` | `KeysViewController` |
| RouterInterface | `<Nome>RouterInterface` | `KeysRouterInterface` |
| RouterManager | `<Nome>RouterManager` | `MainRouterManager` |

## Regras de Importação por Camada

| Camada | Pode importar | Proibido importar |
|---|---|---|
| Domain | Nada externo | UIKit, SwiftUI, BNSCommunication, Liquid |
| Data | BNSCommunication | UIKit, SwiftUI, Liquid |
| Presentation | JourneyCore, Liquid, BNSAnalytics | BNSCommunication direto |
| Router | JourneyCore, BNSNavigation | UIKit (acesso via navigationController) |
| Public | BNSDIContracts, BNSNavigationContracts | Camadas internas |

## Regra de Fluxo de Dados

```
Router instancia → Repository + UseCase + Analytics + ViewModel + ViewController
           ↓
ViewController → viewModel.someMethod()
           ↓
ViewModel → useCase?.method() via Task { [weak self] in ... }
           ↓
UseCase → repository?.method()
           ↓
Repository → BNSCommunication → API → DTO → mapper → Model
           ↓
UseCase retorna Model → ViewModel mapeia → ViewData → @Published state → View/Screen
```

## Proibições absolutas

| Proibido | Alternativa |
|---|---|
| `@Observable` / `@Published` no domain | Domain é puro Swift sem reatividade |
| `Codable`/`Decodable` no Model | DTO faz desserialização, Model é limpo |
| Lógica de negócio na View/Screen | ViewModel/UseCase |
| Navegar diretamente na View | Chamar método `on*` do router |
| Strings literais no código | `Strings.Feature.Key` enum |
| Init manual em DTO ou ViewData | Compilador gera automaticamente |
| `URLSession` diretamente | `BNSCommunication` |
| `@Environment` para DI | Injeção no construtor via RouterManager |
