import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = (file: string) => readFile(path.join(root, 'Src', file), 'utf8')

test('policy group members reorder by dragging instead of move buttons', async () => {
  const [section, profiles, dragSort, collections] = await Promise.all([
    source('Features/Profiles/ProfileGroupSection.vue'),
    source('Composables/useProfiles.ts'),
    source('UI/listDragSort.ts'),
    source('Design/collections.css'),
  ])
  assert.match(section, /useListDragSort\(/)
  assert.match(section, /:data-list-drag-id="id"/)
  assert.ok(section.includes('@pointerdown="beginMemberDrag($event, id)"'))
  assert.match(section, /@keydown\.up\.prevent="moveMember\(id, -1\)"/)
  assert.doesNotMatch(section, /moveGroupChild|nodes\.moveMemberUp|nodes\.moveMemberDown/)
  assert.match(profiles, /function reorderGroupChild\(nextIds: string\[\]\)/)
  assert.match(profiles, /nextIds\.length !== current\.length/)
  assert.match(profiles, /profileModalActions: \{ saveProfile, toggleGroupChild, reorderGroupChild, closeProfileEditor \}/)
  assert.match(section, /onCancel: \(ids\) => actions\.reorderGroupChild\(ids\)/)
  assert.match(dragSort, /addEventListener\('pointermove'/)
  assert.match(dragSort, /prefers-reduced-motion: reduce/)
  assert.match(dragSort, /event\.key !== 'Escape'/)
  assert.match(dragSort, /requestAnimationFrame\(\(\) => autoScroll\(s\)\)/)
  assert.match(collections, /body\.nova-table-dragging,\s*body\.nova-list-dragging/)
})

test('routing rules drag on both the table and the mobile cards', async () => {
  const [panel, routing] = await Promise.all([
    source('Features/Routing/RoutingRulesPanel.vue'),
    source('Composables/useRouting.ts'),
  ])
  assert.match(panel, /useTableDragSort\(/)
  assert.match(panel, /useListDragSort\(/)
  assert.match(panel, /:data-rule-id="rule\.id"/)
  assert.match(panel, /:data-list-drag-id="rule\.id"/)
  assert.ok(panel.includes('@pointerdown="beginRuleDrag($event, rule.id)"'))
  assert.ok(panel.includes('@pointerdown="beginRuleCardDrag($event, rule.id)"'))
  assert.match(panel, /const RULE_COLSPAN = 14/)
  assert.match(panel, /class="table-drag-placeholder-box"/)
  // Row menus no longer own reordering; the batch menu still moves a selection.
  assert.doesNotMatch(panel, /rowMenu[\s\S]*?directions\.map/)
  assert.match(panel, /moveSelectedRules/)
  assert.match(routing, /function moveRoutingRuleToPosition\(ruleId: string, position: number\)/)
  assert.match(routing, /direction: 'position'/)
  assert.doesNotMatch(routing, /function moveRoutingRule\(/)
  assert.match(routing, /moveRoutingRuleToPosition, removeRoutingRule/)
})

test('the list drag ghost follows the pointer and keeps the source slot', async () => {
  const dragSort = await source('UI/listDragSort.ts')
  assert.match(dragSort, /createGhost\(s\.item, s\.startRect\)/)
  assert.match(dragSort, /ghost\.style\.position = 'fixed'/)
  assert.match(dragSort, /translate3d\(0, \$\{s\.pointerY - s\.startY\}px, 0\)/)
  assert.match(dragSort, /classList\.add\('nova-list-dragging'\)/)
  assert.match(dragSort, /captureTops\(container\)/)
  assert.match(dragSort, /flipItems\(container, previous, s\.itemId, s\.reduceMotion\)/)
  assert.match(dragSort, /if \(Math\.abs\(delta\) < 1\) continue/)
  assert.ok(dragSort.includes('const unchanged = ids.length === s.originalIds.length'))
  assert.ok(dragSort.includes('if (!unchanged) options.onDrop?.(ids, s.itemId)'))
  assert.ok(dragSort.includes('options.onCancel?.(originalIds)'))
})
