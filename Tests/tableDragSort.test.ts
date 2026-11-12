import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (file: string) => readFile(path.join(root, 'Src', file), 'utf8')

test('node rows put the checkbox first and render a pointer drag handle next', async () => {
  const table = await source('Features/Nodes/NodesTable.vue')
  const headerCheck = table.indexOf('<th class="cell-check">')
  const headerDrag = table.indexOf('<th class="cell-drag">')
  const rowCheck = table.indexOf('<td class="cell-check"')
  const rowDrag = table.indexOf('<td class="cell-drag"')
  assert.ok(headerCheck >= 0 && headerDrag > headerCheck, 'header checkbox must precede the drag column')
  assert.ok(rowCheck >= 0 && rowDrag > rowCheck, 'row checkbox must precede the drag handle')
  assert.match(table, /@pointerdown="beginProfileDrag\(\$event, profile\.indexId\)"/)
  assert.doesNotMatch(table, /draggable="true"/)
})

test('dragging renders a dashed placeholder and flips the remaining rows', async () => {
  const table = await source('Features/Nodes/NodesTable.vue')
  assert.match(table, /useTableDragSort\(/)
  assert.match(table, /v-if="isDragSorting && dragPlaceholderIndex === index"/)
  assert.match(table, /data-drag-row-key="__placeholder__"/)
  assert.match(table, /class="table-drag-placeholder-box"/)

  const dragSort = await source('UI/tableDragSort.ts')
  assert.match(dragSort, /createGhost\(/)
  assert.match(dragSort, /captureRowTops\(/)
  assert.match(dragSort, /requestAnimationFrame\(\(\) => autoScroll\(s\)\)/)
  assert.match(dragSort, /event\.key !== 'Escape'/)
})

test('the context menu no longer owns row reordering', async () => {
  const menu = await source('Features/Nodes/NodeContextMenu.vue')
  for (const id of ['move-top', 'move-up', 'move-down', 'move-bottom', 'position']) {
    assert.ok(!menu.includes(`id: '${id}'`), `context menu must not keep ${id}`)
  }
})

test('subscription rows reorder by renumbering sort through the API', async () => {
  const page = await source('Pages/SubscriptionsPage.vue')
  assert.match(page, /useTableDragSort\(/)
  assert.match(page, /planDragOrder\(/)
  assert.match(page, /table-drag-placeholder-box/)
  assert.doesNotMatch(page, /updateSelected/)

  const subscriptions = await source('Composables/useSubscriptions.ts')
  assert.match(subscriptions, /async function reorderSubscriptions/)
  assert.match(subscriptions, /if \(Number\(item\.sort \?\? 0\) === index\) continue/)
  assert.match(subscriptions, /sort: index/)
})

test('column settings are wired to both tables and persist visibility', async () => {
  const dialog = await source('Components/Material/ColumnSettingsDialog.vue')
  assert.match(dialog, /:disabled="column\.required"/)
  assert.match(dialog, /emit\('update:modelValue'/)

  const nodesPage = await source('Pages/NodesPage.vue')
  assert.match(nodesPage, /createColumnVisibility\(NODE_COLUMNS, NODE_COLUMN_STORAGE_KEY\)/)
  assert.match(nodesPage, /<NodesTable\b[^>]*:visible-columns="nodeVisibleColumns"/)
  assert.match(nodesPage, /<ColumnSettingsDialog/)

  const subscriptionsPage = await source('Pages/SubscriptionsPage.vue')
  assert.match(subscriptionsPage, /createColumnVisibility\(SUBSCRIPTION_COLUMNS, SUBSCRIPTION_COLUMN_STORAGE_KEY\)/)
  assert.match(subscriptionsPage, /<ColumnSettingsDialog/)
})
