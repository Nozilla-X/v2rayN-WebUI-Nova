export type FieldValueHost = HTMLElement & { value?: string }

/**
 * Reads the live value from a Material text field's native control.
 *
 * Password managers and browser autofill can update the input inside the
 * component's shadow root without dispatching an input event. The component's
 * `value` property may therefore still be empty while the field is visibly
 * filled, so always prefer the native control when it exists.
 */
export function readFieldValue(host: FieldValueHost | null | undefined): string {
  if (!host) return ''
  const control = host.shadowRoot?.querySelector('input, textarea') as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null
  if (control) return control.value
  return typeof host.value === 'string' ? host.value : ''
}
