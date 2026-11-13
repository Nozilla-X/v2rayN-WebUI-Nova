# Keyboard shortcuts

Shortcuts apply only on the Nodes page, only while a node row is focused, and never inside
inputs, textareas, selects, buttons, links, summaries, editable content, dialogs or open menus.
Ctrl/Alt/Meta/Shift chords are never intercepted.

| Key | Action |
| --- | --- |
| `A` | Select all visible nodes |
| `C` | Copy selected share links |
| `E` | Edit the focused/context node |
| `S` | Share selected nodes |
| `1` | TCP latency test |
| `2` | Real-connection latency test |
| `3` | Download speed test |
| `4` | UDP test |
| `5` | Fast real-connection test |
| `6` | Mixed test |
| `Enter` | Activate the focused node |
| `Delete` | Delete the selection (confirmation retained) |
| `T` / `U` / `D` / `B` | Move to top / up / down / bottom |
| `Shift+F10` / Context Menu | Open the row context menu |
| `Escape` | Close the topmost layer |

Escape priority:

1. active confirmation dialog;
2. open action/flyout menu;
3. open node context menu (focus returns to its row);
4. registered modal layer;
5. browser default.

Table selection follows file-manager conventions:

- click selects only that row;
- Ctrl/Cmd-click toggles one row;
- Shift-click selects a contiguous range from the last anchor;
- Ctrl/Cmd+Shift-click adds a range to the existing selection.

Code editors support `Tab`/`Shift+Tab` indentation and `Ctrl/Cmd+Enter` to submit. These
bindings are scoped to the editor and do not become global shortcuts.
