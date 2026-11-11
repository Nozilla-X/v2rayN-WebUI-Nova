# Frontend module boundaries

Nova is a presentation rewrite. The business layer under `Src/Composables` remains the single
source of truth for API requests, sessions, SSE, drafts, data and operation lifecycles.
Feature views read and call that layer through one application context; they never create a
second API client, session, profile list or SSE connection.

## Application assembly

- `Src/App.vue` instantiates the Composables once, wires their dependencies, guards navigation,
  restores the session, switches Backend, loads active-page data and owns overlays.
- `Src/App/context.ts` defines the typed `NovaApp` context. `provide(APP_CONTEXT, ...)` is called
  once in `App.vue`; `useNovaApp()` is the only way pages and shell components reach services.
- `Src/main.ts` mounts Vue, installs the shared i18n instance and reports unhandled UI errors.
- `Src/Composables/useAppRoute.ts` owns canonical hash URLs, history depth, Back behavior,
  browser events, the dirty guard and deep-link aliases. It never owns page data.

## Shell

- `Src/Shell/AppShell.vue` — layout frame, skip link, workspace focus, scroll reset.
- `DesktopSidebar.vue` — brand, main/advanced navigation, badges, runtime status,
  theme/language menus and rail toggle.
- `AppTopBar.vue` / `MobileTopBar.vue` — desktop signals and mobile condensed controls.
- `MobileTabBar.vue` — glass three-tab primary navigation and selection indicator.
- `MobileBackButton.vue` — secondary-page floating Back action.
- `CorePanel.vue` / `BackendPanel.vue` — runtime and endpoint dialogs.
- `SessionScreen.vue` — splash, local-only setup, first-run setup and login; Backend fields
  always appear before credential fields.
- `navigation.ts` — desktop/mobile destinations, More groups and page-title keys.

## Pages and features

Pages are lazy-loaded in `App.vue` and composed from feature modules:

- `Pages/NodesPage.vue` → `Features/Nodes/NodesToolbar`, `NodesTable`, `NodesMobileList`,
  `NodeContextMenu`; shared actions come from `Features/Profiles/useNodeActions.ts`.
- `Pages/SubscriptionsPage.vue` → `Features/Subscriptions/*` and `SubscriptionModal`.
- `Pages/RoutingPage.vue` → `RoutingProfilesPanel`, `RoutingRulesPanel`, `RoutingRawEditor`,
  `RouteModal`, `RuleModal`.
- `Pages/DnsPage.vue` and `Pages/SettingsPage.vue` → section components for DNS profiles,
  inbound, Core, application and speed settings.
- `Pages/TemplatesPage.vue` → `TemplateEditor` for Core templates.
- `Pages/MaintenancePage.vue` → `UpdatesView`, `CoreUpdateTarget`, `WebUpdateTarget`,
  `BackupView`.
- `Pages/LogsPage.vue` → `LogsToolbar` and the log table.
- `Pages/MorePage.vue` — mobile settings hub linking every secondary destination.

Dialogs mount from `Components/Modals/ModalHost.vue`; they read state/actions from the context
instead of receiving copied stores. All editors mutate the parent-owned reactive form.

## Shared UI helpers

- `Components/Material/ActionMenu.vue` — teleported, viewport-clamped, keyboard-accessible menu.
- `Components/Material/AppDialog.vue` + `UI/dialogLayer.ts` — nested dialog stack, focus trap,
  Escape priority, scroll lock.
- `Components/Material/UiCheckbox.vue` — native checkbox with indeterminate sync.
- `Components/Material/PageFeedback.vue` — page-scoped request errors/loading.
- `Components/Material/BackendAddressFields.vue` — Backend address/history/test/apply fields.
- `UI/useUiRequests.ts` — request tracking, scoped busy state, dirty-draft registry and
  cancellation generation.
- `UI/useDraftState.ts` — presentation-only baselines and unsaved-change prompts.
- `UI/useFeedback.ts` — bounded toast queue and confirmation queue.
- `UI/useGlobalShortcuts.ts` — row-scoped shortcuts with editable-target and modal guards.
- `UI/useMediaQuery.ts` — reactive `matchMedia` for mobile compositions.

## Data flow

```text
Backend API
   ↕
useApi (AbortController, session generation, auth headers)
   ↕
business Composables (profiles, subscriptions, routing, dns, settings, templates,
                      maintenance, runtime, logs, events, session)
   ↕
NovaApp context (single instance)
   ↕
pages → feature components → Material primitives
```

Rules:

1. Requests are always issued by a business Composable, never by a page.
2. A Backend change first closes SSE and aborts all pending requests, then changes the base.
3. Responses and SSE events carry generation/session checks; stale results are ignored.
4. List mutations update the owning Composable state; feature components only pass selections
   and submit intents.
5. Navigation is guarded once by `useAppRoute`; feature components do not add their own
   hash listeners.

## Regression checks

`npm test` runs pure business tests plus source-contract tests for this module map, the shell,
the mobile layout, the design tokens and the guarded router. `npm run typecheck` and
`npm run build` verify the Vue/TypeScript and production bundle.
