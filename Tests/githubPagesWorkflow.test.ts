import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('pushing main deploys the verified static build to GitHub Pages', async () => {
  const [pages, config] = await Promise.all([
    readFile(path.join(root, '.github/workflows/pages.yml'), 'utf8'),
    readFile(path.join(root, 'vite.config.ts'), 'utf8'),
  ])

  assert.match(pages, /on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/)
  assert.match(pages, /workflow_dispatch:/)
  assert.match(pages, /permissions:\s*\n\s*contents:\s*read\s*\n\s*pages:\s*write\s*\n\s*id-token:\s*write/)
  assert.match(pages, /uses: actions\/configure-pages@v5/)
  assert.match(pages, /run: npm ci/)
  assert.match(pages, /run: npm test/)
  assert.match(pages, /run: npm run build/)
  assert.match(pages, /path: dist/)
  assert.match(pages, /uses: actions\/upload-pages-artifact@v4/)
  assert.match(pages, /uses: actions\/deploy-pages@v4/)
  assert.match(config, /base:\s*'\.\/'/)
  assert.match(config, /publicDir:\s*'Public'/)
})

test('CI keeps the release archive workflow alongside Pages deployment', async () => {
  const ci = await readFile(path.join(root, '.github/workflows/ci.yml'), 'utf8')
  assert.match(ci, /run: npm test/)
  assert.match(ci, /run: npm run typecheck/)
  assert.match(ci, /run: npm run build/)
  assert.match(ci, /v2rayN-WebUI-Nova\.zip/)
})
