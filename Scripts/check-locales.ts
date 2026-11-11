import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

type LocaleTree = Record<string, unknown>
type SourceEntry = [relativePath: string, contents: string]

const webUiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeNames = ['zh-CN', 'zh-TW', 'en-US']

function flatten(value: LocaleTree, prefix = '', output = new Set<string>()): Set<string> {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child as LocaleTree, fullKey, output)
    } else {
      output.add(fullKey)
    }
  }
  return output
}

const locales = new Map<string, Set<string>>()
for (const name of localeNames) {
  const content = await readFile(path.join(webUiRoot, 'Src', 'Locales', `${name}.json`), 'utf8')
  locales.set(name, flatten(JSON.parse(content) as LocaleTree))
}

const firstLocale = locales.entries().next()
if (firstLocale.done) throw new Error('No locale files were loaded.')
const [, baseKeys] = firstLocale.value
const errors: string[] = []
for (const [name, keys] of locales) {
  const missing = [...baseKeys].filter((key) => !keys.has(key))
  const extra = [...keys].filter((key) => !baseKeys.has(key))
  if (missing.length || extra.length) {
    errors.push(`${name}: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`)
  }
  const apiNamespaces = [...keys].filter((key) => key.split('.')[0]?.endsWith('Api'))
  if (apiNamespaces.length) errors.push(`${name}: legacy API translation namespaces [${apiNamespaces.join(', ')}]`)
}

const sourceRoot = path.join(webUiRoot, 'Src')
// UI strings now live in Shell/Features as well as App and the business Composables.
async function collectSources(directory: string): Promise<SourceEntry[]> {
  const sources: SourceEntry[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) sources.push(...await collectSources(file))
    else if (/\.(vue|ts|js|mjs)$/.test(entry.name)) sources.push([path.relative(sourceRoot, file), await readFile(file, 'utf8')])
  }
  return sources
}
const uiSources = await collectSources(sourceRoot)
const uiKeys = new Set<string>()
for (const [source, content] of uiSources) {
  for (const match of content.matchAll(/\bt\(\s*['"]([\w.-]+)['"]\s*(?:,|\))/g)) {
    const key = match[1]
    if (!key) continue
    uiKeys.add(key)
    if (!baseKeys.has(key)) errors.push(`${source} references missing locale key: ${key}`)
  }
}

const apiMessageKeys = JSON.parse(await readFile(path.join(webUiRoot, 'Tests', 'fixtures', 'api-message-keys.json'), 'utf8')) as string[]
const messageKeys = new Set(apiMessageKeys)
for (const key of messageKeys) {
  if (!baseKeys.has(key)) errors.push(`ApiMessageKeys references missing locale key: ${key}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Locale schema is aligned (${baseKeys.size} keys across ${localeNames.join(', ')}; ${uiKeys.size} UI keys; ${messageKeys.size} API message keys).`)
}
