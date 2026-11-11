import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('API connection fields belong above the Management Key in the login card', async () => {
  const app = await readFile(new URL('../Src/Shell/SessionScreen.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(app, /backend-wrap|backend-box/)
  const loginForm = app.match(/<form[^>]*@submit\.prevent="actions\.loginToBackend"[^>]*>([\s\S]*?)<\/form>/)?.[1]
  assert.ok(loginForm)
  assert.ok(loginForm.indexOf('<BackendAddressFields') < loginForm.indexOf('auth.token'))
  assert.ok(loginForm.indexOf('<BackendAddressFields') < loginForm.indexOf('managementKeyDraft'))
  assert.match(loginForm, /@test="actions\.testConnection"/)
  assert.match(loginForm, /type="submit"[\s\S]*?t\('auth\.connect'\)/)
  const fields = await readFile(new URL('../Src/Components/Material/BackendAddressFields.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(fields, /<form\b/)
  for (const tag of fields.matchAll(/<button\b[^>]*>/g)) assert.match(tag[0], /type="button"/, 'every address-field button must declare type=button so it never submits the login form')
  assert.match(fields, /@keydown\.enter\.prevent="emit\('test'\)"/)
})

test('first-run and local-only setup screens retain Backend switching inside their existing cards', async () => {
  const app = await readFile(new URL('../Src/Shell/SessionScreen.vue', import.meta.url), 'utf8')
  const localOnly = app.match(/<section v-else-if="session\.setupRequired\.value && !session\.setupAllowedFromRequest\.value"[^>]*>([\s\S]*?)<\/section>/)?.[1]
  const setup = app.match(/<form\s+v-else-if="session\.setupRequired\.value"[^>]*>([\s\S]*?)<\/form>/)?.[1]
  assert.match(localOnly, /<BackendAddressFields/)
  assert.match(setup, /<BackendAddressFields[\s\S]*?setup\.managementKey[\s\S]*?setup\.confirmKey/)
})
