// Captures every Nova page at desktop, narrow-desktop, tablet and phone widths.
// The Vite dev server and Playwright run locally against deterministic fixtures.
//
// Usage:
//   node Scripts/capture-screenshots.ts
//   node Scripts/capture-screenshots.ts --locale=en-US --viewport=desktop
//   node Scripts/capture-screenshots.ts --page=nodes,settings
//
import { access, mkdir } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import type { Browser, Page } from 'playwright'
import { screenshotApiHandler, screenshotFixtures } from '../Tests/browser/screenshotFixtures.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(root, 'docs/screenshots')
const fixture = screenshotFixtures()

const VIEWPORTS = {
  desktop: { width: 1440, height: 1000, mobile: false, label: 'desktop' },
  narrow: { width: 1024, height: 900, mobile: false, label: 'narrow' },
  tablet: { width: 820, height: 1180, mobile: true, label: 'tablet' },
  mobile: { width: 390, height: 844, mobile: true, label: 'mobile' },
}

interface PageSpec {
  id: string
  hash: string
  ready: string
}

interface VariantSpec extends PageSpec {
  viewports: string[]
  prepare?: (page: Page) => Promise<void>
}

const PAGES: PageSpec[] = [
  { id: 'nodes', hash: 'nodes', ready: '.nodes-page' },
  { id: 'subscriptions', hash: 'subscriptions', ready: '.subscriptions-page' },
  { id: 'more', hash: 'more', ready: '.more-page' },
  { id: 'routing', hash: 'routing', ready: '.routing-page' },
  { id: 'dns', hash: 'dns', ready: '.dns-page' },
  { id: 'settings', hash: 'settings', ready: '.settings-page' },
  { id: 'templates', hash: 'templates', ready: '.templates-page' },
  { id: 'maintenance', hash: 'maintenance', ready: '.maintenance-page' },
  { id: 'logs', hash: 'logs', ready: '.logs-page' },
]

const VARIANTS: VariantSpec[] = [
  { id: 'dns-advanced', hash: 'dns', viewports: ['desktop', 'mobile'], ready: '.dns-page', async prepare(page: Page) { await page.locator('.dns-tabs .tab').nth(1).click() } },
  { id: 'dns-xray', hash: 'dns', viewports: ['desktop', 'mobile'], ready: '.dns-page', async prepare(page: Page) { await page.locator('.dns-tabs .tab').nth(2).click() } },
  { id: 'dns-singbox', hash: 'dns', viewports: ['desktop', 'mobile'], ready: '.dns-page', async prepare(page: Page) { await page.locator('.dns-tabs .tab').nth(3).click() } },
  { id: 'settings-core', hash: 'settings', viewports: ['desktop', 'mobile'], ready: '.settings-page', async prepare(page: Page) { await page.locator('.settings-tabs .tab').nth(1).click() } },
  { id: 'settings-application', hash: 'settings', viewports: ['desktop', 'mobile'], ready: '.settings-page', async prepare(page: Page) { await page.locator('.settings-tabs .tab').nth(2).click() } },
  { id: 'settings-speedtest', hash: 'settings', viewports: ['desktop', 'mobile'], ready: '.settings-page', async prepare(page: Page) { await page.locator('.settings-tabs .tab').nth(3).click() } },
  { id: 'settings-core-types', hash: 'settings', viewports: ['desktop', 'mobile'], ready: '.settings-page', async prepare(page: Page) { await page.locator('.settings-tabs .tab').nth(4).click() } },
  { id: 'maintenance-backup', hash: 'maintenance', viewports: ['desktop', 'mobile'], ready: '.maintenance-page', async prepare(page: Page) { await page.locator('.maintenance-tabs .tab').nth(1).click() } },
  { id: 'nodes-hover', hash: 'nodes', viewports: ['desktop'], ready: '.nodes-page', async prepare(page: Page) {
    await page.locator('.nodes-table-shell tbody tr').nth(1).hover()
  } },
  { id: 'nodes-selection', hash: 'nodes', viewports: ['desktop'], ready: '.nodes-page', async prepare(page: Page) {
    const boxes = page.locator('.nodes-table-shell tbody md-checkbox')
    await boxes.nth(0).click()
    await boxes.nth(2).click()
    await page.locator('.nodes-table-shell .selection-count').waitFor({ state: 'visible' })
  } },
  { id: 'profile-edit', hash: 'nodes', viewports: ['desktop', 'mobile'], ready: '.nodes-page', async prepare(page: Page) {
    await page.locator('.nodes-toolbar .toolbar-actions button[aria-haspopup="menu"]').first().click()
    await page.locator('.action-menu-popup .menu-item').first().click()
    await page.locator('.dialog').waitFor({ state: 'visible' })
  } },
  { id: 'subscription-menu', hash: 'subscriptions', viewports: ['desktop'], ready: '.subscriptions-page', async prepare(page: Page) {
    await page.locator('.subscription-table tbody tr .action-menu-trigger').first().click()
    await page.locator('.menu-popup').waitFor({ state: 'visible' })
  } },
  { id: 'subscription-add', hash: 'subscriptions', viewports: ['desktop', 'mobile'], ready: '.subscriptions-page', async prepare(page: Page) {
    await page.locator('.subscriptions-page .page-actions .btn-filled').click()
    await page.locator('.dialog').waitFor({ state: 'visible' })
  } },
  { id: 'routing-rule', hash: 'routing', viewports: ['desktop', 'mobile'], ready: '.routing-page', async prepare(page: Page) {
    await page.locator('.rules-head .btn-filled').click()
    await page.locator('.dialog').waitFor({ state: 'visible' })
  } },
  { id: 'backend-panel', hash: 'more', viewports: ['desktop', 'mobile'], ready: '.more-page', async prepare(page: Page) {
    await page.locator('.topbar-actions button:visible, .mobile-topbar-actions button:visible').first().click()
    await page.locator('.dialog').waitFor({ state: 'visible' })
  } },
  { id: 'backend-history', hash: 'more', viewports: ['desktop', 'mobile'], ready: '.more-page', async prepare(page: Page) {
    // The previous variant leaves its connection dialog open on this page.
    if (await page.locator('.dialog').count()) await page.keyboard.press('Escape')
    await page.locator('.topbar-actions button:visible, .mobile-topbar-actions button:visible').first().click()
    const dialog = page.locator('.dialog')
    await dialog.waitFor({ state: 'visible' })
    // A successful test remembers an explicit address; the same-origin address is
    // normalized away, so exercise the field the way a remote backend would.
    await dialog.locator('md-outlined-text-field input').fill(new URL(page.url()).origin)
    await dialog.locator('.backend-field-actions button').first().click()
    const trigger = page.locator('.history-trigger').first()
    await trigger.waitFor({ state: 'visible' })
    await trigger.click()
    await page.locator('.history-menu').waitFor({ state: 'visible' })
  } },
]

interface CaptureOptions {
  locale: string
  viewports: string[]
  pages: string[]
  includeVariants: boolean
  includeLogin: boolean
}

function parseArgs(argv: string[]): CaptureOptions {
  const options: CaptureOptions = { locale: 'zh-CN', viewports: Object.keys(VIEWPORTS), pages: PAGES.map(page => page.id), includeVariants: true, includeLogin: true }
  for (const arg of argv) {
    if (arg.startsWith('--locale=')) options.locale = arg.slice('--locale='.length)
    if (arg.startsWith('--viewport=')) options.viewports = arg.slice('--viewport='.length).split(',').filter(Boolean)
    if (arg.startsWith('--page=')) options.pages = arg.slice('--page='.length).split(',').filter(Boolean)
    if (arg === '--no-variants') options.includeVariants = false
    if (arg === '--no-login') options.includeLogin = false
  }
  return options
}

async function findAvailablePort(): Promise<number> {
  const probe = net.createServer()
  return new Promise<number>((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (!address || typeof address === 'string') return reject(new Error('Could not reserve a local port'))
      probe.close(error => error ? reject(error) : resolve(address.port))
    })
  })
}

async function resolveChromium(chromium: typeof import('playwright').chromium): Promise<{ executablePath?: string }> {
  try {
    await access(chromium.executablePath())
    return {}
  } catch {
    for (const candidate of [
      '/home/ywpc/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
      '/home/ywpc/.cache/ms-playwright/chromium_headless_shell-1248/chrome-linux/headless_shell',
    ]) {
      try {
        await access(candidate)
        return { executablePath: candidate }
      } catch { /* try the next candidate */ }
    }
    throw new Error('Playwright Chromium is not installed. Run: npx playwright install chromium')
  }
}

const options = parseArgs(process.argv.slice(2))
const { chromium } = await import('playwright')
const launchOptions = await resolveChromium(chromium)
let server: ViteDevServer | undefined
let browser: Browser | undefined

try {
  const port = await findAvailablePort()
  server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    server: { host: '127.0.0.1', port, strictPort: true },
    logLevel: 'error',
  })
  await server.listen()
  const httpServer = server.httpServer
  if (!httpServer) throw new Error('Vite did not expose an HTTP server')
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Vite did not expose a local TCP address')
  const base = `http://127.0.0.1:${address.port}/`
  // Playwright hides scrollbars by default, which makes dense tables look like
  // their right-hand columns are simply cut off. Capture what users see.
  browser = await chromium.launch({ ...launchOptions, ignoreDefaultArgs: ['--hide-scrollbars'] })

  await mkdir(outputRoot, { recursive: true })
  const errors: string[] = []
  const requestedViewports = Object.entries(VIEWPORTS).filter(([key]) => options.viewports.includes(key))

  for (const [viewportKey, viewport] of requestedViewports) {
    const output = path.join(outputRoot, options.locale, viewportKey)
    await mkdir(output, { recursive: true })
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      colorScheme: 'light',
      locale: options.locale,
      timezoneId: 'Asia/Shanghai',
      reducedMotion: 'reduce',
    })
    await context.addInitScript(({ locale }) => {
      localStorage.setItem('v2rayn-api-session:' + encodeURIComponent(location.origin), 'screenshot-session')
      localStorage.setItem('v2rayn-web-locale', locale)
      localStorage.setItem('v2rayn-web-theme', 'light')
      Object.defineProperty(window, 'EventSource', {
        configurable: true,
        value: class {
          readyState = 1
          addEventListener() {}
          removeEventListener() {}
          close() { this.readyState = 2 }
        },
      })
    }, { locale: options.locale })
    const page = await context.newPage()
    page.on('console', message => { if (message.type() === 'error') errors.push(`${viewportKey}: ${message.text()}`) })
    page.on('pageerror', error => errors.push(`${viewportKey}: PAGEERROR ${error.message}`))
    await page.route('**/api/**', screenshotApiHandler(fixture))

    async function open(hash: string): Promise<void> {
      await page.goto(`${base}#/${hash}`, { waitUntil: 'domcontentloaded' })
      await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 30_000 })
    }

    async function capture(name: string, { ready, prepare }: { ready?: string; prepare?: (target: Page) => Promise<void> } = {}): Promise<void> {
      if (ready) await page.locator(ready).first().waitFor({ state: 'visible', timeout: 20_000 })
      if (prepare) await prepare(page)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(450)
      // Viewport first, so the fixed mobile chrome is captured in place.
      await page.screenshot({ path: path.join(output, `${name}-viewport.png`), animations: 'disabled', caret: 'hide' })
      // The app scrolls inside .workspace-scroll, so a full-page capture has to
      // temporarily release the frame; fixed chrome would otherwise repeat mid-page.
      await page.evaluate(() => {
        const style = document.createElement('style')
        style.id = 'nova-capture-expand'
        style.textContent = `
          html, body, #app { height: auto !important; }
          .app-shell { height: auto !important; min-height: 100dvh !important; overflow: visible !important; }
          .app-main { height: auto !important; min-height: 0 !important; overflow: visible !important; padding-bottom: 0 !important; }
          .workspace-scroll { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .workspace { min-height: 0 !important; padding-bottom: var(--nova-space-6) !important; }
          .mobile-tab-bar, .mobile-back-button, .mobile-bulk-bar { display: none !important; }
        `
        document.head.append(style)
      })
      await page.waitForTimeout(60)
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled', caret: 'hide' })
      // Hash-only navigation keeps this document alive, so remove the capture
      // override before the next page is opened.
      await page.evaluate(() => document.getElementById('nova-capture-expand')?.remove())
      console.log(`Captured ${path.relative(root, path.join(output, `${name}.png`))} (${viewport.width}×${viewport.height})`)
    }

    if (options.includeLogin) {
      const loginPage = await context.newPage()
      await loginPage.route('**/api/**', screenshotApiHandler(fixture))
      await loginPage.addInitScript(({ locale }) => {
        localStorage.removeItem('v2rayn-api-session:' + encodeURIComponent(location.origin))
        localStorage.setItem('v2rayn-web-locale', locale)
        localStorage.setItem('v2rayn-web-theme', 'light')
        Object.defineProperty(window, 'EventSource', { configurable: true, value: class { addEventListener() {} removeEventListener() {} close() {} } })
      }, { locale: options.locale })
      await loginPage.goto(base, { waitUntil: 'domcontentloaded' })
      await loginPage.locator('.session-card, .splash-screen').first().waitFor({ state: 'visible', timeout: 20_000 })
      await loginPage.waitForTimeout(500)
      await loginPage.screenshot({ path: path.join(output, 'login.png'), fullPage: true, animations: 'disabled', caret: 'hide' })
      await loginPage.screenshot({ path: path.join(output, 'login-viewport.png'), animations: 'disabled', caret: 'hide' })
      console.log(`Captured ${path.relative(root, path.join(output, 'login.png'))}`)
      await loginPage.close()
    }

    for (const pageInfo of PAGES.filter(item => options.pages.includes(item.id))) {
      await open(pageInfo.hash)
      await capture(pageInfo.id, { ready: pageInfo.ready })
    }

    if (options.includeVariants) {
      for (const variant of VARIANTS) {
        if (!variant.viewports.includes(viewportKey)) continue
        if (!options.pages.some(id => variant.hash === id || variant.id === id)) continue
        await open(variant.hash)
        await capture(variant.id, { ready: variant.ready, prepare: variant.prepare })
      }
    }

    await context.close()
  }

  if (errors.length) {
    console.error('\nBrowser errors during capture:')
    for (const error of [...new Set(errors)]) console.error(`  ${error}`)
    process.exitCode = 1
  } else {
    console.log('\nNo browser console or page errors.')
  }
} finally {
  await browser?.close()
  await server?.close()
}
