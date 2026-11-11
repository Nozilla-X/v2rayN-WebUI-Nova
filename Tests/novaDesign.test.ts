import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import postcss from 'postcss'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function designCss() {
  const directory = path.join(root, 'Src/Design')
  const files = (await readdir(directory)).filter((name) => name.endsWith('.css'))
  const sources = await Promise.all([
    ...files.map(async (name) => [name, await readFile(path.join(directory, name), 'utf8')]),
    readFile(path.join(root, 'Src/style.css'), 'utf8').then((source) => ['style.css', source]),
  ])
  return sources.map(([name, source]) => [name, postcss.parse(source)])
}

test('every design token reference resolves to a declared token', async () => {
  const sources = await designCss()
  const defined = new Set()
  for (const [, css] of sources) css.walkDecls(/^--/, (declaration) => defined.add(declaration.prop))
  // Set inline by MobileTabBar from the active destination index.
  defined.add('--tab-offset')
  const missing = []
  for (const [name, css] of sources) {
    css.walkDecls((declaration) => {
      for (const match of declaration.value.matchAll(/var\((--[\w-]+)/g)) {
        if (!defined.has(match[1])) missing.push(`${name}: ${match[1]}`)
      }
    })
  }
  assert.deepEqual(missing, [])
})

test('color literals stay inside the palette and both themes define the full role set', async () => {
  const sources = await designCss()
  for (const [name, css] of sources) {
    // The generated palette is the one file allowed to carry raw colors.
    if (name === 'tokens.css' || name === 'color-roles.css') continue
    css.walkDecls((declaration) => {
      assert.doesNotMatch(
        declaration.value,
        /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(/i,
        `${name} must use semantic roles instead of raw colors`,
      )
    })
  }

  const tokens = (await readFile(path.join(root, 'Src/Design/tokens.css'), 'utf8'))
  const roles = await readFile(path.join(root, 'Src/Design/color-roles.css'), 'utf8')
  const light = roles.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  const explicitDark = roles.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || ''
  for (const role of [
    'primary', 'on-primary', 'primary-container', 'on-primary-container',
    'secondary-container', 'on-secondary-container', 'tertiary-container',
    'error', 'on-error', 'background', 'on-background', 'surface',
    'on-surface', 'surface-variant', 'on-surface-variant', 'outline',
    'inverse-surface', 'inverse-on-surface', 'surface-container-low',
    'surface-container', 'surface-container-high', 'surface-container-highest',
  ]) {
    assert.match(light, new RegExp(`--md-sys-color-${role}:`), `light ${role}`)
    assert.match(explicitDark, new RegExp(`--md-sys-color-${role}:`), `explicit dark ${role}`)
  }
  assert.match(roles, /--md-sys-color-scrim:/)
  assert.match(roles, /color-scheme: light/)
  assert.match(roles, /color-scheme: dark/)

  // Following the system theme is resolved before first paint by the inline
  // bootstrap, so data-theme is always present when CSS roles are consumed.
  const html = await readFile(path.join(root, 'index.html'), 'utf8')
  assert.match(html, /localStorage\.getItem\('v2rayn-web-theme'\)/)
  assert.match(html, /matchMedia\('\(prefers-color-scheme: dark\)'\)/)
  assert.match(html, /document\.documentElement\.dataset\.theme = dark \? 'dark' : 'light'/)
  assert.match(html, /id="theme-color-meta"/)
  assert.match(tokens, /@media \(prefers-color-scheme: dark\)[\s\S]*?:root:not\(\[data-theme\]\)/)
})

test('Liquid Glass is a local enhancement with opaque and motion-reduced fallbacks', async () => {
  const glass = await readFile(path.join(root, 'Src/Design/glass.css'), 'utf8')
  assert.match(glass, /\.glass-surface\s*\{[^}]*background: var\(--nova-glass-fill-strong\)/)
  assert.match(glass, /@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
  assert.match(glass, /backdrop-filter: blur\(var\(--nova-glass-blur\)\) saturate/)
  assert.match(glass, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?backdrop-filter: none/)
  assert.match(glass, /@media \(prefers-contrast: more\)[\s\S]*?backdrop-filter: none/)
  assert.match(glass, /@media \(forced-colors: active\)[\s\S]*?background: Canvas/)
  assert.match(glass, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none/)
  assert.match(glass, /--nova-safe-bottom/)
  assert.match(glass, /max-height: 500px\)[\s\S]*?\.mobile-tab-bar \{\s*display: none/)
  assert.doesNotMatch(glass, /\.workspace[^{]*\{[^}]*backdrop-filter/, 'the content workspace stays opaque')
})

test('modal and menu layers keep focus, Escape and scroll-lock contracts', async () => {
  const dialog = await readFile(path.join(root, 'Src/Components/Material/AppDialog.vue'), 'utf8')
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /enterDialog\(\)/)
  assert.match(dialog, /isTopDialog\(layerId\)/)
  assert.match(dialog, /event\.key === 'Escape'/)
  assert.match(dialog, /event\.key !== 'Tab'/)
  const layer = await readFile(path.join(root, 'Src/UI/dialogLayer.ts'), 'utf8')
  assert.match(layer, /document\.body\.classList\.add\('nova-dialog-open'\)/)
  assert.match(layer, /document\.body\.classList\.remove\('nova-dialog-open'\)/)

  const menu = await readFile(path.join(root, 'Src/Components/Material/ActionMenu.vue'), 'utf8')
  assert.match(menu, /role="menu"/)
  assert.match(menu, /aria-haspopup="menu"/)
  assert.match(menu, /Teleport to="body"/)
  assert.match(menu, /event\.key === 'Escape'/)
})

test('safe areas and the three-tab mobile navigation are wired to real destinations', async () => {
  const navigation = await readFile(path.join(root, 'Src/Shell/navigation.ts'), 'utf8')
  const tabs = navigation.match(/MOBILE_TABS[^=]*=\s*\[([\s\S]*?)\]/)?.[1] || ''
  const ids = [...tabs.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1])
  assert.deepEqual(ids, ['nodes', 'subscriptions', 'more'])

  const layout = await readFile(path.join(root, 'Src/Design/layout.css'), 'utf8')
  const topbar = await readFile(path.join(root, 'Src/Design/topbar.css'), 'utf8')
  assert.match(topbar, /--nova-safe-top/)
  assert.match(layout, /--nova-safe-bottom/)
  assert.match(layout, /@media \(max-width: 860px\)/)
  assert.match(layout, /(?:min-)?height:\s*100dvh/)
})
