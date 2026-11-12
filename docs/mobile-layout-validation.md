# Mobile layout validation

Nova treats mobile as a separate interaction model, not a compressed desktop table.

## Contract

- **Primary navigation:** a floating three-item glass bar — Nodes, Subscriptions, More.
  Secondary destinations (Routing, DNS, Settings, Templates, Maintenance, Logs) are reached
  through the More hub. The selected indicator slides between the three tabs via transform.
- **Secondary pages:** a floating glass Back button appears in the top-left safe area. It is
  hidden on primary pages and never covers the page title or primary action. Back uses browser
  history when an in-app entry exists; otherwise it replaces history with More, so a deep link
  cannot send the browser out of the application.
- **Top bar:** a compact fixed bar shows the runtime state and provides refresh/Backend/Core
  actions. Secondary pages reserve extra left padding for the Back button.
- **Content:** tables become mobile cards. Nodes expose selection, current state, protocol,
  latency/speed, traffic and the full per-node action menu. List rows wrap long names, endpoints
  and URLs instead of forcing horizontal scrolling.
- **Selection:** a floating bulk bar sits above the tab bar with selection-aware commands.
- **Dialogs:** full-width, single-column forms with touch-sized controls; body scrolling is
  locked and focus is trapped.
- **Safe areas:** bars and dialogs use `env(safe-area-inset-*)` through `--nova-safe-*`.
  The tab bar hides when the viewport height is 500px or less to avoid the on-screen keyboard.
- **Motion:** the tab indicator and icon transitions respect `prefers-reduced-motion`.
- **Material:** glass is used only for the tab bar, Back button and transient floating surfaces.
  Opaque, high-contrast and forced-colors fallbacks are defined in `Design/glass.css`.

## Breakpoints

| Width | Layout |
| --- | --- |
| `>1100px` | Expanded desktop rail |
| `861–1100px` | Icon-only rail |
| `≤860px` | Mobile top bar, floating tab bar, Back button, cards |
| `≤380px` | Reduced glass blur |
| height `≤500px` | Floating tab bar hidden |

These boundaries are literal CSS media queries; JavaScript uses the same `860px` value in
`useMediaQuery` for the mobile bulk bar. The toolbar no longer switches composition by
viewport: desktop and mobile both leave context-menu actions to the shared node menu.

## Automated checks

`Tests/mobileLayout.test.ts` verifies:

- exactly three primary destinations, with every secondary destination present in More;
- glass tab-bar/fixed positioning/safe-area/indicator structure;
- Back-button visibility and guarded fallback;
- desktop rail collapse and mobile-only surfaces;
- node cards with selection, current state and action menus.

`Tests/novaNavigation.test.ts` covers deep links, history depth, Back restoration and the
single dirty guard shared by browser and in-app navigation. `Tests/novaDesign.test.ts`
covers glass fallbacks and safe-area tokens.

Optional Playwright scripts under `Tests/browser/` are isolated and must not manage a real
Backend when used for acceptance.
