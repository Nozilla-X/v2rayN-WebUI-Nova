import assert from 'node:assert/strict'
import test from 'node:test'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function scriptFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await scriptFiles(file))
    else files.push(path.relative(root, file))
  }
  return files
}

const exists = async (file: string): Promise<boolean> => access(file).then(() => true, () => false)

test('tooling scripts are written in TypeScript', async () => {
  const files = [...await scriptFiles(path.join(root, 'Scripts')), ...await scriptFiles(path.join(root, 'Tests'))]
  assert.deepEqual(files.filter((file) => /\.(js|mjs|cjs)$/.test(file)), [])
  assert.ok(files.some((file) => file.endsWith('.ts')))
})

test('the Vite config and package scripts point at TypeScript entry points', async () => {
  const [manifest, hasTsConfig, hasJsConfig] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8'),
    exists(path.join(root, 'vite.config.ts')),
    exists(path.join(root, 'vite.config.js')),
  ])
  const pkg = JSON.parse(manifest) as { scripts: Record<string, string> }
  assert.equal(hasTsConfig, true)
  assert.equal(hasJsConfig, false)
  for (const name of ['test', 'check-locales', 'icons', 'theme']) {
    assert.match(pkg.scripts[name] ?? '', /\.ts\b/)
  }
  assert.match(pkg.scripts.typecheck ?? '', /tsconfig\.node\.json/)
})
