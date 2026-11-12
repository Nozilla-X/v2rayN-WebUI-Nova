import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { preventNativeContextMenu } from '../Src/Components/contextMenu.ts'

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Src')

test('the node context menu nests secondary actions and Escape closes one layer at a time', async () => {
  const [menu, shortcuts] = await Promise.all([
    readFile(path.join(sourceRoot, 'Features/Nodes/NodeContextMenu.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'UI/useGlobalShortcuts.ts'), 'utf8'),
  ])
  assert.match(menu, /const profileMenu = computed<MenuEntry\[\]>/)
  assert.match(menu, /children:\s*\[/)
  assert.match(menu, /class="menu-item submenu-trigger"/)
  assert.match(menu, /class="menu-popup context-submenu"/)
  assert.match(menu, /@menu-escape="closeSubmenu\(true\)"/)
  // Touch browsers synthesize mouseenter before click; only open on hover when
  // the device actually supports hover, otherwise the tap opens and closes.
  assert.match(menu, /matchMedia\('\(hover: hover\)'\)/)
  assert.match(menu, /@media \(max-width: 860px\)\s*\{[\s\S]*?\.context-menu \.menu-shortcut[\s\S]*?\.context-submenu \.menu-shortcut[\s\S]*?display:\s*none/)
  assert.match(shortcuts, /querySelector<HTMLElement>\('\.context-submenu'\)/)
  assert.match(shortcuts, /submenu\.dispatchEvent\(new Event\('menu-escape'/)
})

test('profile and subscription group context actions suppress native menus on consecutive right-clicks', async () => {
  const [table, toolbar, mobile, menu, actionMenu] = await Promise.all([
    readFile(path.join(sourceRoot, 'Features/Nodes/NodesTable.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Features/Nodes/NodesToolbar.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Features/Nodes/NodesMobileList.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Features/Nodes/NodeContextMenu.vue'), 'utf8'),
    readFile(path.join(sourceRoot, 'Components/Material/ActionMenu.vue'), 'utf8'),
  ])
  assert.match(table, /@contextmenu\.stop\.prevent="actions\.openContext\(\$event, profile\)"/)
  assert.match(toolbar, /class="group-chips"[^>]*@contextmenu\.prevent\.stop="openSelectedGroupContext\(\$event\)"/)
  assert.match(toolbar, /@contextmenu\.prevent\.stop="openGroupContext\(\$event, group\)"/)
  assert.match(toolbar, /function openSelectedGroupContext\([\s\S]*?state\.selectedGroup[\s\S]*?openGroupContext\(event, group\)/)
  assert.match(toolbar, /@dblclick\.prevent\.stop="openGroupContext\(\$event, group\)"/)
  assert.match(toolbar, /function selectGroup\([\s\S]*?event\.detail > 1[\s\S]*?actions\.changeGroup\(group\.id\)/)
  assert.match(mobile, /@contextmenu\.prevent/)
  assert.match(menu, /class="menu-popup context-menu"[^>]*@contextmenu="preventNativeContextMenu"/)
  assert.match(menu, /contextMenu\.type === 'subscription'[\s\S]*?contextActions\.editSubscriptionFromContext[\s\S]*?contextActions\.addSubscriptionFromContext[\s\S]*?contextActions\.deleteSubscriptionFromContext/)
  assert.match(actionMenu, /class="menu-popup action-menu-popup"[\s\S]*?@contextmenu\.prevent\.stop/)
  assert.equal(menu.includes("document.addEventListener('contextmenu'"), false)
  assert.equal(menu.includes('window.addEventListener("contextmenu"'), false)

  const observed = []
  for (let click = 1; click <= 3; click += 1) {
    const event = { prevented: false, stopped: false, preventDefault() { this.prevented = true }, stopPropagation() { this.stopped = true } }
    preventNativeContextMenu(event)
    observed.push([event.prevented, event.stopped])
  }
  assert.deepEqual(observed, [[true, true], [true, true], [true, true]])
})
