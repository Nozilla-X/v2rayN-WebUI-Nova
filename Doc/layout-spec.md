# Nova layout contract

This document is normative. **MUST**, **MUST NOT**, **SHOULD** and **MAY** carry their usual
RFC 2119 meaning. Every page, shell surface and feature component follows these rules; a
change that cannot follow them requires an explicit exception recorded here and a test that
pins the exception.

The visual language (tokens, color roles, Material primitives, glass) is defined in
[`design-system.md`](design-system.md). Mobile navigation and card composition are defined in
[`mobile-layout-validation.md`](mobile-layout-validation.md). This document owns **geometry,
scroll ownership, sizing, drag/column behavior and where transient UI is allowed to live**.
The appendix records the commits that motivated the non-obvious rules.

## 1. Shell, chrome and scroll ownership

Nova is an application shell, not a scrolling document.

- `.app-shell` and `.app-main` MUST own the viewport height (`100dvh`) and MUST set
  `overflow: hidden`.
- `.workspace-scroll` is the **only** page-level scroll container. Pages MUST NOT set
  `body`, `html` or `#app` overflow, and MUST NOT create a second full-page scroller.
- `.workspace` keeps `width: min(100%, var(--nova-content-max))` (1600px). A page MUST NOT
  replace it with a private `max-width`; fill the workspace or use the page grid.
- A page MAY contain an internally scrolling table or list. That scroller MUST be an explicit
  component boundary (`.table-shell` or a documented list), not an accidental overflow.
- Horizontal scrolling is allowed only inside a `.table-shell`. The page itself MUST NEVER
  scroll sideways.
- Dialogs MAY lock body scrolling through `UI/dialogLayer.ts`. No other component may
  manipulate body scroll.
- `calc(100dvh - …)` page heights, fixed footers and negative margins used to "fit" content are
  forbidden. Flex/grid sizing plus `min-height: 0` is the supported mechanism.
- The desktop sidebar footer is a **non-interactive status region**: `role="status"`, a state
  dot and one version line. It MUST NOT be a button, show a chevron, hover like a control or
  duplicate the state as a second strong label. The collapsed rail hides the copy.
- While a drag session is active, the body carries `nova-table-dragging` or
  `nova-list-dragging`; those are the only global layout classes a feature may add.

Canonical shell:

```text
.app-shell
└─ .app-main
   ├─ top bar
   └─ .workspace-scroll        <- the only vertical page scroller
      └─ .workspace            <- max width + page padding
         └─ .page              <- page section grid
```

## 2. Page composition

- `.page` is a one-column grid with `align-content: start` and `gap: var(--nova-page-gap)`.
  Page sections stack in document order; empty trailing space is expected and is not a bug.
- Multi-card pages use `.page-grid` with the twelve-column `.span-4/5/6/7/8/12` helpers.
  Components MUST NOT invent a parallel column system in scoped CSS. A named feature
  workspace (for example `.routing-workspace`) MAY define its own grid, but the feature MUST
  NOT add a second page-level grid.
- Every grid or flex child that contains a table, long text, or a truncating label MUST set
  `min-width: 0`. Every flex child that scrolls MUST set `min-height: 0`.
- `.page-head` keeps copy on the leading edge and `.page-actions` on the trailing edge.
  Actions wrap; they are never absolutely positioned over the title.
- Section padding, gaps and card geometry come from tokens (`--nova-space-*`,
  `--md-sys-shape-corner-*`). Scoped CSS may only express layout relationships.
- Below `700px`, `.page-grid` collapses to one column and every `.span-*` becomes full width.

## 3. Equal-height panes

Two-column workspaces are a single row, not two independently sized cards.

- The workspace grid MUST use `align-items: stretch`.
- Each pane MUST be a flex column (`display: flex; flex-direction: column; gap: …`).
- The pane's scrolling middle section MUST use `min-height: 0; flex: 1 1 auto;` and MUST be
  the only part that grows.
- Footer actions (for example preset buttons) are the last flex child and stay pinned to the
  bottom edge of the stretched card.
- Below the two-column breakpoint (`≤1100px`) the workspace collapses to one column and the
  list regains a bounded height (`max-height: 60dvh`) so the page does not become an
  unbounded scroll of rows.

Reference implementation: `Src/Pages/RoutingPage.vue` (`.routing-workspace`) and
`Src/Features/Routing/RoutingProfilesPanel.vue` (`.routing-panel`, `.route-list`).

## 4. Tables and dense data

- Desktop tables MUST use `.table-shell` + `.data-table`; semantic `<table>` markup is
  required. Mobile replaces tables with cards (see mobile contract).
- Every horizontally scrollable table MUST apply `v-scroll-shadow`
  (`Src/UI/scrollShadow.ts`). The directive owns the `is-scrollable-x` / `is-scroll-end`
  classes used for edge shadows.
- Headers are sticky via the shared `.data-table th` rule. Row height comes from
  `--nova-table-row-height`; cells MUST NOT set their own heights.
- The action column MAY be pinned with `.table-shell.sticky-actions` only when the shell also
  uses `v-scroll-shadow`. If the pane is too narrow to keep preceding columns readable, the
  pin MUST be disabled with a container query (see `.rules-table-shell` at `1400px`).
- A pane whose height would jump when data changes MUST declare a stable shell height
  (`height: clamp(320px, 52dvh, 560px)` in the routing rules panel). Do **not** use
  `max-height` for that pane.
- Empty and loading states render inside the table shell (row/cell), never by removing the
  shell. The pane keeps its height across data loads.
- Truncation belongs to an **inner wrapper**, never to the `<td>`/`<th>` itself. A `max-width`
  on the cell prevents the stretched column from drawing its bottom border when optional
  columns are hidden. Use `.name-cell-inner` / `.sub-remarks-main` patterns and add `title`
  for the full value.
- The current-node marker is absolutely positioned in the `.name-cell` trailing gutter. Every
  row reserves that gutter (`padding-inline-end`) so the name column does not shift when the
  current row changes.
- Columns that receive streaming values (delay, speed) reserve a fixed width so the table
  does not reflow while tests fill in results.
- Numeric columns are right-aligned with tabular numerals; `.cell-actions` is right-aligned.
- Pagination, filters and bulk commands belong in `.page-toolbar`; `.toolbar-actions` fills the
  row (`flex: 1 1 auto`) and aligns to the trailing edge.

## 5. Viewport budgeting

When a page chooses to fit its primary table to the viewport, it MUST use a documented
chrome budget rather than an arbitrary cap.

- The nodes table uses `max-height: max(320px, calc(100dvh - 268px))`. The 268px budget covers
  the top bar, page padding, toolbar, page gaps, footer hint and workspace tail; it MUST stay
  documented next to the rule.
- `320px` is the usable floor. If the viewport is shorter, `.workspace-scroll` scrolls; the
  table MUST NOT collapse below the floor.
- Fixed caps such as the former `min(68dvh, 820px)` are forbidden for viewport-fitted tables.
  A cap that ignores the shell chrome leaves dead space below the table on tall screens and
  hides rows on short ones.
- A table that intentionally grows with its content (subscriptions) MAY omit the cap; it then
  scrolls with `.workspace-scroll` under the single-scroll-owner rule.
- Any change to top-bar, toolbar or page-padding height MUST update the budget and the
  screenshot fixture expectations in the same change.
- A bounded secondary pane (routing rules) uses the stable `clamp()` height from §4; a log
  viewer MAY use its own documented `dvh` cap because it is a secondary, independently
  scrollable surface.

## 6. Toolbars and control order

- `.page-toolbar` is one wrapping flex row: title/description on the leading edge,
  `.toolbar-actions` on the trailing edge. `.toolbar-actions` MUST keep `flex: 1 1 auto` and
  `justify-content: flex-end`.
- Controls follow this order:
  1. view controls that change what the table shows (`locate current`, `column settings`);
  2. search/filter input;
  3. primary create action (`Add`);
  4. secondary test/batch menus.
- A control that changes the view MUST appear before the search it affects. Column settings
  MUST NOT sit after search or after the primary action. The subscription page follows the
  same rule: column settings and proxy filter precede `Add` and `Update all`.
- Search fields submit on Enter. A separate refresh button that repeats the same request is
  forbidden, and toolbar inputs share the same control height.
- On mobile, labeled toolbar actions use at most two columns. Only actions that are **not**
  available in the shared context menu stay in the toolbar; everything else moves into that
  menu so labels never truncate.
- Page-level action rows that mix buttons and menu triggers (for example the routing page
  actions) share `--nova-control-height-comfortable`; align their boxes, not just their text.
- `.save-bar` wraps and keeps the draft status on the leading edge (`margin-right: auto`);
  save/discard buttons never push it off-screen.

## 7. Drag sorting

Reordering is pointer-driven and reproducible; native HTML5 drag is not used.

- A drag handle MUST be a labelled `<button>` (`aria-label` + `title`) with a 44px
  column/slot, `touch-action: none`, `user-select: none`, `cursor: grab/grabbing` and
  `-webkit-user-drag: none`. The component MUST NOT set `draggable="true"`.
- In tables, column order is: checkbox (when selection exists), drag handle, data columns,
  actions. A table without selection starts with the drag column. The handle stops row
  activation (click, and dblclick where the row defines one) so grabbing a row never opens it.
- Dragging begins after a 4px pointer move and only for the primary mouse button. The ghost
  is a fixed, `aria-hidden` clone at the reserved drag layer (1200), clipped to the table
  scrollport; the clone strips ids and tabindexes and reproduces the sticky action column.
- The source row/card is removed from its slot (table) or hidden with `opacity: 0` (list).
  A dashed placeholder (`table-drag-placeholder-box`) reserves the exact row height and is
  `aria-hidden`.
- The insertion index is computed from layout positions with in-flight FLIP transforms
  subtracted, then clamped to the list bounds. Measuring the animated rect directly is
  forbidden; it makes the drop target depend on animation timing.
- Remaining rows/cards shift with a 200ms FLIP. Edge auto-scroll activates within 56px of the
  viewport edge at 10px per frame and re-evaluates the placeholder after each scroll.
- The table freezes its header column widths (`table-layout: fixed`) for the duration of the
  drag so removing the dragged row cannot resize the remaining columns.
- `Escape` and `pointercancel` MUST end the drag without issuing a write. List callers either
  leave the live order uncommitted (form state) or reload the authoritative order (routing
  cards); table callers leave the rendered order unchanged until drop.
- The table drag helper MUST NOT report a drop when the resulting order is unchanged. List
  callers SHOULD skip the write when the final order matches the starting order.
- The shared row context menu MUST NOT duplicate drag commands (`move-top`, `move-up`,
  `move-down`, `move-bottom`, `position`). Dragging is the single reorder affordance.
- Reduced motion disables the FLIP and ghost/placeholder entrance animations; the final order
  is still applied.

Interaction constants:

| Constant | Value |
| --- | --- |
| Drag start threshold | 4px |
| FLIP duration | 200ms |
| Auto-scroll edge | 56px |
| Auto-scroll step | 10px per frame |
| Drag ghost layer | 1200 (reserved) |

Reference: `Src/UI/tableDragSort.ts`, `Src/UI/listDragSort.ts`.

## 8. Column visibility

- Tables with optional columns MUST use the shared `UI/columnPreferences.ts` helpers and
  `Components/Material/ColumnSettingsDialog.vue`. Each table declares its own definitions
  (`Features/Nodes/nodeColumns.ts`, `Features/Subscriptions/subscriptionColumns.ts`).
- Identity columns are `required` and MUST stay visible (node/subscription name). Selection,
  drag and action columns are structural and are not part of the visibility list.
- Preferences are per table and persisted through `browserStorage`. Stored values are
  untrusted: unknown ids and duplicates are dropped, the declared order is restored, required
  columns are re-added, and malformed JSON falls back to showing every column.
- Hidden columns are removed from rendering. `colspan` and the table's minimum width MUST be
  derived from the visible columns’ declared widths, never hard-coded.
- Optional columns declare a width so the minimum table width stays correct as columns are
  hidden. Recompute the width and `colspan` in the same computed value used by the table.
- The column settings trigger belongs with the other view controls, before search and primary
  actions (§6). It opens the shared dialog; each table does not own a private dialog.

Reference tests: `Tests/columnPreferences.test.ts`, `Tests/tableDragSort.test.ts`.

## 9. Feedback channel

Transient feedback MUST NOT participate in layout.

- Errors, warnings, validation results, clipboard failures and background read failures MUST
  be shown through the toast channel:
  `app.feedback.showNotice(message, kind)` or `app.feedback.showError(error)`.
- Toast rendering is global (`Src/UI/useFeedback.ts`, `Src/Design/overlays.css`). Toasts are
  fixed bottom-right on desktop and sit above the mobile navigation with safe-area offsets.
  They are queued, deduplicated and bounded; regular notices are evicted before a persistent
  operation status.
- Long-running operations use `showPersistentNotice(...)` and dismiss it when the operation
  ends. The status MUST survive bursts of regular notices. Do not add an inline "testing"
  row, a stop button next to it, or a second progress surface for the same operation.
- A component MUST NOT render a transient error/notice block between a toolbar and content,
  inside a page header, or as an extra row that appears and disappears.
- Field validation MAY set `aria-invalid` and disable submit, but the explanatory message MUST
  go to toast. It MUST NOT insert a text node that changes height.
- A **persistent condition** (backend disconnected, incompatible runtime, DNS conflict) MAY use
  an inline banner because it must remain visible while the condition lasts. It is placed
  directly under the section heading, never in a toolbar, and MUST NOT duplicate a toast for
  the same event.
- Background read failures are reported once by
  `Src/Components/Material/PageFeedback.vue`; write failures belong to the action that
  initiated them (`errorFromWrite` prevents double reporting).

## 10. Selection UI

Selection state has exactly one numeric surface: the badge on the select-all checkbox.

- Markup MUST wrap the select-all checkbox in `.selection-check` and place the count in
  `.selection-count` (shared styles in `Src/Design/collections.css`).
- The badge is hidden at zero, is a 16px primary pill at the checkbox's top inline-end corner,
  uses tabular numerals and `pointer-events: none`.
- "Selected N items" text, count pills, selection summaries and clear-selection buttons MUST
  NOT appear in page headers, toolbars, lists, tables or mobile bulk bars.
- Batch commands remain available through an `ActionMenu` (desktop toolbar or mobile floating
  bulk bar). The mobile bulk bar sizes to its content, stays above the tab bar and respects
  safe areas.
- Selecting all / clearing all is done through the checkbox itself. No second control may
  duplicate that function.
- Mobile card checkboxes use `.mobile-card-check` and align to the **center** of the two-line
  title; status/action controls stay at the top edge. On selection-oriented cards (nodes),
  tapping the card selects it; tapping the checkbox toggles selection without selecting the
  card.

## 11. Menus and command placement

- The page-level overflow menu contains page-scoped commands only (for example importing
  profiles). It MUST NOT duplicate row commands such as "set active" or "delete selected".
- Row-scoped commands live in the row's action menu. A page menu entry that acts on the current
  selection is allowed only for genuinely page-wide batch operations, and it MUST be hidden or
  disabled when nothing is selected; "(0)" placeholders are forbidden.
- A command that already exists as a selection batch action MUST NOT be repeated as a separate
  page button (the former "update selected" subscription button is the canonical counterexample).
- Mobile data cards whose desktop rows share a context menu (nodes) MUST reuse that same menu
  (`actions.openContext`), not a private per-card item list. The trigger is the standard dots
  icon button.
- Submenus open on hover only when `(hover: hover)` matches. Touch browsers synthesize a
  `mouseenter` before the click, which would otherwise open then immediately close the menu.
- Context-menu keyboard shortcut hints are hidden at `≤860px`.
- Menu width animations are forbidden: `.menu-popup` uses `transition: none` so a measured
  min-width never animates while items change.
- Destructive commands keep the confirmation flow from `UI/useFeedback.ts`.

## 12. Disclosures and mobile card detail

- Every `<details>` disclosure MUST use `v-details-motion` and place its body in a direct
  `.ui-details-content` wrapper. Browsers without `interpolate-size` keep the native instant
  toggle through the fallback in `Src/Design/motion.css`.
- Opening animates to the measured content height (300ms); closing animates back (200ms).
  `summary` clicks are intercepted because `<details>` does not fire `beforetoggle`; script
  changes to the `open` attribute are covered by the toggle listener. Reduced motion sets the
  final state immediately.
- When expanded content would extend below the visible scrollport, the disclosure scrolls to
  the top of that scrollport (smooth unless reduced motion). Sections that already fit stay
  where the user tapped them. The same rule is reused when a mobile card mounts detail content
  on the next tick.
- Mobile cards with read-only secondary metadata MUST default to collapsed. The title is the
  disclosure control with `aria-expanded` and `aria-controls`; a chevron rotates on open.
  Checkbox/menu controls stop propagation; tapping elsewhere on the card toggles the detail.
- A mobile status that carries a label is a visible chip (`badge`), not a bare dot that relies
  on a hover title.
- Mobile subscription cards keep the update action on the update line (`.subscription-update-copy`
  with `min-width: 0`, `.subscription-update-button` with `flex: 0 0 auto`). They do not add a
  redundant details disclosure.
- The mobile top bar reserves `calc(72px + var(--nova-safe-left))` when the Back button is
  present: 48px button + 12px inset + a 12px gutter before the title.

## 13. Forms and dialogs

- `.field-row` uses `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`, `align-items: start`
  and the standard gap. Inputs/textareas inside fields set `min-width: 0`.
- A floating-label select is one 56px control while a labeled field is a label plus that
  control. In a `.field-row`, `.ui-select` MUST bottom-align (`align-self: end`) so its box is
  level with neighboring inputs.
- Dense editors collapse `.field-row` to one column at `600px`. Feature grids that use a
  different boundary (for example the 700px group-member grid) keep their local rule and
  document it.
- DNS endpoint fields use a wider `300px` minimum so DoH URLs fit. URL-bearing fields MUST NOT
  be squeezed into the default 220px track.
- The templates editor keeps a two-by-two field arrangement between `701px` and `1200px`; do
  not collapse it early.
- Strategy/action rows align their controls on the bottom edge (`align-items: end`) and share
  the comfortable control height.
- Session cards keep backend/API connection fields **above** the Management Key, one `<form>`
  per card and no nested forms. Helper buttons inside a form MUST declare `type="button"`;
  Enter submits the form.
- Checkbox/button rows share the control height with neighboring fields; `.check` keeps the
  touch-target minimum.
- Dialog forms are single-column on mobile, use touch-sized controls and lock body scroll.
  Mobile inputs stay at 16px to avoid browser zoom.
- Advanced JSON disclosures inside dialogs use the disclosure contract from §12.

## 14. Responsive contract

Shell and page boundaries are fixed:

| Boundary | Required behavior |
| --- | --- |
| `>1100px` | Expanded desktop rail; two-column workspaces stay side by side |
| `≤1100px` | Rail collapses to icons; two-column workspaces become one column; route list regains `max-height: 60dvh` |
| `≤860px` | Mobile shell: desktop rail/top bar hidden, floating tab bar and Back button shown, tables become cards, toast sits above the tab bar |
| `≤700px` | `.page-grid` collapses to one column |
| `≤600px` | Dense editor field rows (DNS, settings, profile/subscription dialogs) use one column |
| `≤500px` height | Floating tab bar hides to avoid the on-screen keyboard |
| `≤380px` | Reduced glass blur |

Component-local content thresholds already in the codebase are limited to this ladder; a new
value requires a comment explaining the content that stops fitting and a regression test:

| Values | Scope |
| --- | --- |
| `1460`, `1400` (container) | Routing rules minimum table width and action-column unpin |
| `1280`, `1200`, `1180`, `1080` | Settings/topbar compression, subscription action unpin, node search width |
| `701–1200` | Templates two-by-two field grid |
| `560`, `520`, `480`, `420`, `370` | Compact rule dialog, tabs, dialog bodies, log pagination, topbar |

- JavaScript that needs a breakpoint MUST use the same value through `useMediaQuery`
  (`860px` for mobile bulk behavior). Components MUST NOT introduce a new viewport query when
  an existing boundary expresses the intent.
- Visibility switches use `.desktop-only` / `.mobile-only`. The mobile side MUST NOT set
  `display` at desktop widths; the desktop side MUST NOT set `display` at mobile widths.
- Mobile-only fixed surfaces MUST use `--nova-safe-*` offsets and `--nova-z-*` layers.
- The mobile tab bar keeps three equal tabs and hides on short viewports; content padding
  reserves its height plus the safe-area bottom.

## 15. Tokens, layers and motion

- Spacing, radii, colors, typography, elevation, motion and z-index MUST use the tokens from
  `Src/Design/tokens.css`. Components MUST NOT declare private palettes, radii or shadows.
- Stacking order comes from `--nova-z-*` only. The drag ghost is the single exception: it uses
  the reserved layer `1200` so it floats above menus/dialogs for the duration of the pointer
  session; that layer MUST NOT be reused by persistent UI. The drag ghost's directional
  shadow is the only permitted private shadow.
- Motion uses the `--md-sys-motion-*` tokens. `prefers-reduced-motion` removes transform-based
  travel while keeping opacity/color feedback; content is visible in its final state.
- The group-switch content animation and menu/toast entrances MUST be disabled under reduced
  motion; spinners may slow down but never stop.
- Glass is restricted to the surfaces listed in `design-system.md`. Content areas, tables and
  forms MUST NOT receive large-area backdrop filters.

## 16. Accessibility invariants

- Focus is always visible (`--nova-focus-ring`); focus MUST NOT be suppressed or replaced by a
  custom outline that lacks contrast.
- Icon-only controls carry localized labels; tables keep header semantics; select-all exposes
  the selected count in its accessible name.
- Scrollable regions that are keyboard-reachable MUST have `tabindex="0"` and a label, and MUST
  show the focus ring on the region.
- Sticky headers and pinned action columns MUST NOT cover focused cells or row actions.
- Drag handles are buttons with localized labels; the drag session never traps focus, and the
  ghost is `aria-hidden`.
- Mobile card disclosures expose `aria-expanded`/`aria-controls`; the detail content contains
  no editable controls.
- A control whose label swaps between states (play/pause) MUST NOT also expose `aria-pressed`;
  use one state channel only.
- Status conveyed as text (enabled/disabled chip) MUST NOT rely on a hover-only title.
- Layout MUST reflow without horizontal page scrolling at 320 CSS px.

## 17. Enforcement

A layout rule without a guard is a suggestion. Any change to shell geometry, pane sizing,
tables, drag sorting, column visibility, feedback placement or selection UI MUST add or update
a check:

| Test | Covers |
| --- | --- |
| `Tests/layoutStability.test.ts` | Scroll model, viewport budget, equal-height routing panes, stable table height, sidebar status, inner truncation, field-select alignment, toolbar order, selection badges, sticky shadows, toast-only feedback |
| `Tests/tableDragSort.test.ts` | Checkbox→handle order, no native drag, ghost/placeholder/flip/auto-scroll/Escape, column settings wiring |
| `Tests/listDragSort.test.ts` | Mobile card/member dragging, live reorder, source slot, FLIP |
| `Tests/columnPreferences.test.ts` | Required columns, untrusted storage, declared order |
| `Tests/mobileLayout.test.ts` | Mobile navigation, Back gutter, cards, selection, routing detail disclosure |
| `Tests/auditRegression.test.ts` | Current-row marker gutter, routing columns/container query, mobile status chip, toolbar labels, disclosures |
| `Tests/dnsLayout.test.ts` | Workspace cap, field grid, 600px collapse, control alignment |
| `Tests/loginLayout.test.ts` | Connection fields above the key, no nested forms, button types |
| `Tests/novaDesign.test.ts` | Tokens, glass fallbacks, palette confinement |

Visual changes MUST also be checked with the Playwright fixture harness at `1440×1000`,
`1024×900`, `820×1180` and `390×844`, and screenshots regenerated with
`node Scripts/capture-screenshots.ts` into `Doc/screenshots/`.

Acceptance checklist:

1. `document.documentElement.scrollWidth <= clientWidth` at every viewport.
2. The workspace scrolls; the page body does not.
3. Two-column panes end within 1px of each other; the footer is pinned to the card bottom.
4. Switching datasets does not change the table shell height; viewport-fitted tables end at
   the documented budget.
5. No transient message occupies document flow; toasts stay inside the viewport and above the
   mobile tab bar.
6. The only visible selection count is the badge on the select-all checkbox.
7. Drag ghosts stay clipped to the table scrollport and column widths do not jump; Escape
   leaves no ghost, placeholder or body class behind.
8. Hiding optional columns leaves no gap in row dividers or the table's minimum width.
9. Mobile detail cards start collapsed, expose ARIA state and scroll opened content into view.
10. `npm test`, `npm run typecheck` and `npm run build` pass.

## 18. Forbidden patterns

| Pattern | Why it is forbidden |
| --- | --- |
| Page/body-level scrolling or `calc(100vh - header)` heights | Breaks the single-scroll-owner model and mobile viewport behavior |
| `max-height` on a pane that switches data | The page jumps when the dataset shrinks |
| Fixed pixel cap on a viewport-fitted table height | Leaves dead space or hides rows instead of tracking the viewport |
| Equal-height columns achieved with fixed heights | Breaks at different viewports and with wrapping copy |
| `max-width` on a table cell for truncation | The stretched column loses its bottom border when columns are hidden |
| "Selected N" text, count pills, clear-selection buttons | Duplicates the badge and shifts layout |
| Inline transient error/success blocks in toolbars or page flow | Pushes content and competes with the toast channel |
| Inline long-running operation status with a stop button | Duplicates the persistent toast and changes page height |
| Page menu entries duplicating row actions | Two sources of truth for the same command |
| `draggable="true"` / native HTML5 drag | Inconsistent ghosting, no FLIP/placeholder, no Escape contract |
| Context-menu move commands next to drag handles | Two competing reorder affordances |
| Hard-coded `colspan` / table `min-width` | Breaks as soon as a column is hidden |
| Pinned action column without scroll shadow / container guard | Overlays content and hides ellipses |
| Custom `<details>` animation without `v-details-motion` | Inconsistent timing and a broken closing animation |
| Hover-opened submenus on touch | Opens then closes on the synthesized click |
| Ad-hoc breakpoints not in the ladder | Diverges from the responsive contract and JS media queries |
| Hardcoded colors, radii, shadows or z-index | Bypasses theme, contrast and layering guarantees |
| Mobile surfaces toggled with `display` at desktop widths | Overrides the component's own layout display |

## Appendix: regression provenance

The non-obvious rules above were extracted from the repository history, not invented:

| Commit | Rules added to this contract |
| --- | --- |
| `1250082` Refine sidebar status and fit nodes table to viewport | Sidebar status is non-interactive dot + version line; nodes table uses the documented `100dvh` budget instead of a fixed 820px cap |
| `f53c4b1` Add table drag sorting and column settings | Checkbox→drag order, fixed ghost + dashed placeholder + FLIP + auto-scroll + Escape, table column-width freeze, shared column preferences with required columns, continuous row dividers when columns hide, toolbar control order |
| `625c65d` Fix unchanged profile saves and polish mobile interactions | Persistent operation toast, disclosure animation/scroll-into-view, collapsed mobile routing detail, status chip, mobile Back gutter, subscription update line, two-column mobile toolbar |
| `fbe6134` Fix profile JSON payloads and complete drag sorting | Mobile list drag for group members and routing rules, ghost clipping to the scrollport and sticky action column, drag bounds, bottom-aligned selects in field rows |
| `582c4b3` Add Nova WebUI, API contract, and project documentation | Shell/scroll model, content cap, page grid, tokens, control heights, mobile navigation and safe areas |
| `7b38c5f` / `be3e5ae` session autofill | Backend fields above the key, one form per card, `type="button"` helper controls, Enter submission structure |
