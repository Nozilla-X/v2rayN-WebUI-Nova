# Nova visual system

Nova uses Material Design 3 roles as the base language, with a small Liquid Glass layer
reserved for floating navigation and transient surfaces. Every visual decision resolves
through tokens; feature components do not carry private palettes, radii or shadows.

## Entry points

```text
Src/style.css
├─ Design/tokens.css        color roles, typography, shape, elevation, motion, spacing
├─ Design/base.css          reset, body, focus, scrollbars, native form baseline
├─ Design/components.css    index for controls, collections and feedback
│  ├─ buttons.css           filled/tonal/outlined/text/danger, icon buttons, ripples
│  ├─ fields.css            inputs, selects, checkboxes, chips, segmented controls
│  ├─ collections.css       cards, tables, lists, tabs, page headings, pagination
│  ├─ overlays.css          menus, dialog scrim/panel, toasts, FAB
│  └─ feedback.css          banners, badges, empty/loading, save bars, code areas
└─ Design/shell.css         index for application layout
   ├─ layout.css            app shell grid, workspace, page, breakpoints
   ├─ sidebar.css           desktop rail/drawer and collapsed states
   ├─ topbar.css            desktop/mobile app bars and signal pills
   ├─ mobile.css            mobile-only surfaces, More hub, cards, bulk bar
   └─ glass.css             Liquid Glass material and floating mobile navigation
```

`Src/style.css` also owns session-screen and route-transition styles. Pages may use small
scoped blocks for feature-local grid constraints; shared typography, color, radius and
control geometry always come from the token layer.

## Token namespaces

| Namespace | Purpose |
| --- | --- |
| `--md-sys-color-*` | Material 3 semantic color roles (light and dark) |
| `--md-sys-typescale-*` | Font families, sizes, line heights and weights |
| `--md-sys-shape-corner-*` | Component, card, menu and dialog radii |
| `--md-sys-elevation-level*` | Shadow levels; dark theme overrides them |
| `--md-sys-motion-*` | Duration and easing tokens; reduced motion is handled per animation instead of rewriting the tokens |
| `--nova-space-*` | 4px-based spacing scale |
| `--nova-field-height`, `--nova-control-height*`, `--nova-touch-target` | Control geometry |
| `--nova-safe-*` | `env(safe-area-inset-*)` with zero fallbacks |
| `--nova-z-*` | Layering order (sidebar, bars, menus, dialogs, toasts) |
| `--nova-color-*` | Success/warning/info, dividers, selected/current rows, code surfaces |
| `--nova-glass-*` | Glass fill, border, highlight, tint, blur, saturation and shadow |

Theme selection writes `data-theme="light|dark"` on `<html>`; `index.html` resolves the saved
or system preference before first paint to avoid a flash. CSS also handles a missing
`data-theme` under `prefers-color-scheme: dark`. `color-scheme` is kept in sync for native
controls and scrollbars.

## Material components

- **Buttons** keep native `<button>` semantics and explicit `type` attributes. Filled,
  tonal, outlined, text, danger and success variants share state-layer and ripple rules.
- **Fields** use native inputs/selects/textareas with `.field` labels, hints and errors.
  Mobile inputs stay at 16px to avoid browser zoom.
- **Checkboxes** remain native checkboxes (including indeterminate state) rather than
  simulated switches.
- **Tables** use semantic table markup; selected rows win over hover, current rows use the
  tertiary container role, and numeric columns align consistently.
- **Dialogs** (`AppDialog`) provide teleported scrims, focus trapping, return focus, nested
  Escape priority and body scroll lock through `UI/dialogLayer.ts`.
- **Menus** (`ActionMenu`, context menus) are teleported, viewport-clamped, keyboard
  navigable with Arrow/Home/End/Escape and expose `role="menu"`/`menuitem` semantics.
- **Toast** feedback is queued, deduplicated and bounded by `UI/useFeedback.ts`.
- **Icons** are stroke SVGs from one path registry (`Components/Material/icons`), rendered by
  `UiIcon` with decorative or labelled modes.

## Liquid Glass

Glass is a material applied through `.glass-surface`, not a page background. It is used by:

- the mobile three-tab bar;
- the mobile floating Back button;
- small floating/teleported surfaces that benefit from separation from content.

Rules:

1. Default rendering is an opaque-ish strong fill with border and highlight layers; blur is
   added only inside `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: ...))`.
2. `prefers-reduced-transparency: reduce`, `prefers-contrast: more` and `forced-colors: active`
   remove blur and restore readable solid colors.
3. `prefers-reduced-motion: reduce` removes indicator and icon transitions.
4. Blur radius drops on very narrow screens; the tab bar hides when viewport height is
   short (on-screen keyboard).
5. Content areas, tables and forms never receive large-area backdrop filters.

## Responsive contract

| Boundary | Behavior |
| --- | --- |
| `>1100px` | Full desktop rail with labels and utility text |
| `861–1100px` | Rail collapses to icons/tooltips automatically |
| `≤860px` | Desktop sidebar and top bar hide; mobile top bar, floating tab bar and Back button appear; cards replace tables |
| `≤860px` and `≤500px` height | Floating tab bar hides to avoid keyboard overlap |
| `≤380px` | Glass blur reduced for low-power devices |

Mobile is not a scaled desktop: node cards, mobile bulk actions, the More hub, mobile dialogs
and touch-sized controls are separate compositions.

## Motion

- Route, page, dialog, menu and toast entrances use M3 duration/easing tokens; page items
  stagger briefly so navigation settles instead of snapping.
- `<details>` disclosures animate `::details-content` between `0` and `auto` with
  `interpolate-size: allow-keywords`, `overflow: clip`, `contain: layout` and a discrete
  `content-visibility` transition. Browsers without auto-size interpolation keep the native
  instant toggle, and interpolation is scoped to the disclosure rather than `:root`.
- Reduced motion is handled per animation: slide, scale, rotate and indicator travel are
  removed, while colour, opacity and shadow feedback keeps its transition. Loading
  indicators only slow down, and the final state is always visible.

## Accessibility

- A skip link targets the workspace; page transitions reset scroll without stealing focus.
- All icon-only controls have localized labels.
- Focus rings use `--nova-focus-ring` with visible offsets; focus is never suppressed.
- Dialog focus is trapped and restored; background scrolling is locked while open.
- Motion respects user preferences; color contrast follows roles with dedicated high-contrast
  and forced-colors fallbacks.

## Verification

`Tests/novaDesign.test.ts` enforces token completeness, palette confinement, light/dark role
coverage, glass fallbacks, dialog/menu contracts and safe-area usage. `Tests/mobileLayout.test.ts`
enforces the three-tab mobile navigation and Back-button contract.
