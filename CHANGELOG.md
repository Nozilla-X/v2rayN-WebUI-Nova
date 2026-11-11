# Changelog

## [Unreleased]

## [2.0.0] - 2026-11-11

Nova is a complete presentation-layer rewrite of v2rayN WebUI. It keeps the original API
contract, Composables, session model and security behavior while replacing every screen.

### Added

- Material Design 3 design-token system with light, dark and system themes.
- Desktop navigation rail with collapse state, badges, runtime status and theme/language menus.
- Native mobile shell: three-tab floating glass navigation, safe-area handling, mobile cards,
  guarded floating Back button and a Material **More** settings hub.
- Hash routing with canonical URLs, per-page history, deep-link recovery, browser Back
  integration and one unsaved-changes guard for navigation and draft changes.
- Local Liquid Glass surfaces with opaque, reduced-transparency, high-contrast, forced-colors
  and reduced-motion fallbacks.
- Rebuilt nodes, subscriptions, routing, DNS, settings, templates, maintenance and logs pages.
- Rebuilt profile/import/export, subscription, route and rule dialogs on shared MD3 primitives.
- Nova navigation, history, mobile, design-token and glass fallback tests.

### Preserved

- Backend address normalization, history and same-origin/standalone behavior.
- Login, first-run setup, session scoping, Management Key non-persistence and Backend switching
  cancellation of pending requests and SSE.
- Node CRUD, groups, search, sorting, batch actions, all speed-test types and export/share paths.
- Subscriptions, routing profiles/rules, DNS, settings, templates, Core lifecycle and updates,
  logs, backup/restore and realtime events.
- zh-CN, zh-TW and en-US locales, Desktop-parity wording and API message keys.

### Changed

- The UI is now composed from lazy pages, small feature modules and reusable Material primitives.
- Shared CSS is split into focused modules; no page depends on the legacy layout stylesheet.
