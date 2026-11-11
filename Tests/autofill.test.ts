import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFieldValue } from '../Src/UI/fieldValue.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('an autofilled shadow control is read even when the Material host value is still empty', () => {
  const host = {
    value: '',
    shadowRoot: { querySelector: () => ({ value: 'autofilled-management-key' }) },
  } as unknown as HTMLElement & { value: string }
  assert.equal(readFieldValue(host), 'autofilled-management-key')
})

test('the field value helper falls back to the host and handles a missing field', () => {
  const host = {
    value: 'host-value',
    shadowRoot: { querySelector: () => null },
  } as unknown as HTMLElement & { value: string }
  assert.equal(readFieldValue(host), 'host-value')
  assert.equal(readFieldValue(null), '')
})

test('session forms sync live field values before validation', async () => {
  const field = await readFile(path.join(root, 'Src/Components/Material/UiTextField.vue'), 'utf8')
  const screen = await readFile(path.join(root, 'Src/Shell/SessionScreen.vue'), 'utf8')

  assert.match(field, /@change="onInput"/)
  assert.match(field, /@focusin="onInput"/)
  assert.match(field, /@focusout="onInput"/)
  assert.match(field, /addEventListener\('focus', sync, true\)/)
  assert.match(field, /addEventListener\('blur', sync, true\)/)
  assert.match(field, /defineExpose\(\{ syncFromDom \}\)/)
  assert.match(field, /if \(field\.value && field\.value\.value !== raw\) field\.value\.value = raw/)
  assert.match(field, /raw === '' && \(props\.modelValue === null \|\| props\.modelValue === undefined\)/)

  assert.match(screen, /@click\.capture="syncLoginKey"[\s\S]*@submit\.prevent="submitLogin"/)
  assert.match(screen, /@click\.capture="syncSetupKeys"[\s\S]*@submit\.prevent="submitSetup"/)
  assert.match(screen, /@submit\.prevent="submitLogin"/)
  assert.match(screen, /@submit\.prevent="submitSetup"/)
  assert.match(screen, /ref="loginKeyField"/)
  assert.match(screen, /ref="setupKeyField"/)
  assert.match(screen, /ref="setupConfirmKeyField"/)
  assert.match(screen, /@keydown\.enter="submitOnEnter\(\$event, syncLoginKey, submitLogin\)"/)
  assert.match(screen, /@keydown\.enter="submitOnEnter\(\$event, syncSetupKeys, submitSetup\)"/)
  assert.match(screen, /form\.reportValidity\(\)/)
  assert.match(screen, /event\.isComposing \|\| event\.keyCode === 229 \|\| performance\.now\(\) - compositionEndedAt < 50/)
  assert.match(screen, /@compositionend="onCompositionEnd"/)
  assert.match(screen, /event\.target !== event\.currentTarget/)
  assert.match(screen, /loginSubmitting\.value \|\| session\.loading\.value/)
  assert.match(screen, /setupSubmitPending\.value \|\| session\.setupSubmitting\.value/)
  assert.match(screen, /session\.loading\.value \|\| loginSubmitting/)
  assert.match(screen, /session\.setupSubmitting\.value \|\| setupSubmitPending/)

  const loginSubmit = screen.match(/function submitLogin\(\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const setupSubmit = screen.match(/function submitSetup\(\) \{([\s\S]*?)\n\}/)?.[1] ?? ''
  assert.ok(loginSubmit.indexOf('syncLoginKey()') < loginSubmit.indexOf('actions.loginToBackend()'))
  assert.ok(setupSubmit.indexOf('syncSetupKeys()') < setupSubmit.indexOf('actions.configureAndRemember()'))
})
