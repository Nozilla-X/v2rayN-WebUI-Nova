import type { Directive } from 'vue'

/*
 * Native <details> elements snap unless the browser can interpolate the
 * ::details-content block size, which is still uneven across engines. The
 * directive below animates an explicit content wrapper with the Web Animations
 * API, so every disclosure uses the same timing and easing. It also scrolls
 * an expanded section into view when its content would overflow the scrollport,
 * which keeps long editors (routing JSON, DNS JSON, advanced rule JSON) from
 * opening entirely below the fold.
 *
 * A details element only reports the new state after it has already opened or
 * closed, and beforetoggle is not fired for details at all (it belongs to
 * popovers and dialogs). The summary click is therefore intercepted to take
 * over both directions; the toggle listener only covers open attribute changes
 * made from script.
 */

const CONTENT_SELECTOR = ':scope > .ui-details-content'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const OPEN_DURATION = 300
const OPEN_EASING = 'cubic-bezier(0.05, 0.7, 0.1, 1)'
const CLOSE_DURATION = 200
const CLOSE_EASING = 'cubic-bezier(0.3, 0, 0.8, 0.15)'

interface DetailsState {
  content: HTMLElement
  animation?: Animation
}

const states = new WeakMap<HTMLDetailsElement, DetailsState>()
const cleanups = new WeakMap<HTMLDetailsElement, () => void>()

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION).matches
}

function nearestScrollPort(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent
    parent = parent.parentElement
  }
  return null
}

/**
 * Align an expanded disclosure with the top of its scrollport, but only when
 * its content would actually extend below the visible area. Small sections
 * that already fit stay where the user tapped them.
 */
export function scrollDisclosureIntoView(element: HTMLElement, content?: HTMLElement | null): void {
  if (typeof element.scrollIntoView !== 'function') return
  const body = content ?? element.querySelector<HTMLElement>(CONTENT_SELECTOR)
  const anchor = element.querySelector<HTMLElement>(':scope > summary') ?? element
  const contentHeight = body ? body.scrollHeight : element.scrollHeight
  const scrollPort = nearestScrollPort(element)
  const visibleBottom = scrollPort ? scrollPort.getBoundingClientRect().bottom : window.innerHeight
  if (anchor.getBoundingClientRect().bottom + contentHeight <= visibleBottom + 1) return
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
    inline: 'nearest',
  })
}

function clearAnimationStyles(content: HTMLElement): void {
  content.style.removeProperty('height')
  content.style.removeProperty('overflow')
  content.style.removeProperty('will-change')
}

function cancelAnimation(state: DetailsState): void {
  state.animation?.cancel()
  state.animation = undefined
}

function animateOpen(details: HTMLDetailsElement, state: DetailsState): void {
  if (prefersReducedMotion()) {
    clearAnimationStyles(state.content)
    scrollDisclosureIntoView(details, state.content)
    return
  }
  if (state.animation) return

  // Measure before pinning the wrapper at zero: an overflow-hidden box still
  // reports its full scroll height, so the target stays exact.
  const target = state.content.scrollHeight
  if (target <= 0) {
    clearAnimationStyles(state.content)
    return
  }
  state.content.style.overflow = 'hidden'
  state.content.style.height = '0px'
  state.content.style.willChange = 'height'
  void state.content.offsetHeight
  const animation = state.content.animate(
    [
      { height: '0px', opacity: 0.4 },
      { height: `${target}px`, opacity: 1 },
    ],
    { duration: OPEN_DURATION, easing: OPEN_EASING },
  )
  state.animation = animation
  animation.onfinish = () => {
    if (state.animation !== animation) return
    state.animation = undefined
    clearAnimationStyles(state.content)
  }
  scrollDisclosureIntoView(details, state.content)
}

function animateClose(details: HTMLDetailsElement, state: DetailsState): void {
  if (prefersReducedMotion()) {
    clearAnimationStyles(state.content)
    details.open = false
    return
  }
  if (state.animation) return

  const current = state.content.getBoundingClientRect().height
  if (current <= 0) {
    clearAnimationStyles(state.content)
    details.open = false
    return
  }
  state.content.style.overflow = 'hidden'
  state.content.style.height = `${current}px`
  state.content.style.willChange = 'height'
  void state.content.offsetHeight
  const animation = state.content.animate(
    [
      { height: `${current}px`, opacity: 1 },
      { height: '0px', opacity: 0 },
    ],
    { duration: CLOSE_DURATION, easing: CLOSE_EASING },
  )
  state.animation = animation
  animation.onfinish = () => {
    if (state.animation !== animation) return
    state.animation = undefined
    clearAnimationStyles(state.content)
    details.open = false
  }
}

function onSummaryClick(event: MouseEvent): void {
  const details = event.currentTarget as HTMLDetailsElement
  const state = states.get(details)
  if (!state) return
  const target = event.target as Element | null
  const summary = target?.closest('summary')
  if (!summary || summary.parentElement !== details) return
  if (prefersReducedMotion()) return
  if (state.animation) {
    // Keep the open attribute in sync with the running animation; a second
    // click must not toggle the native state behind its finish handler.
    event.preventDefault()
    return
  }
  event.preventDefault()
  if (details.open) {
    animateClose(details, state)
    return
  }
  // Set the open state ourselves so the content can be measured (and pinned
  // at zero) synchronously, before the browser paints the fully open section.
  details.open = true
  animateOpen(details, state)
}

function onToggle(event: Event): void {
  const details = event.currentTarget as HTMLDetailsElement
  const state = states.get(details)
  if (!state) return
  if (details.open) {
    // Covers open attribute changes made from script; a summary click already
    // started its animation and is ignored here.
    animateOpen(details, state)
    return
  }
  cancelAnimation(state)
  clearAnimationStyles(state.content)
}

export const vDetailsMotion: Directive<HTMLDetailsElement> = {
  mounted(details) {
    const content = details.querySelector<HTMLElement>(CONTENT_SELECTOR)
    if (!content) return
    details.classList.add('ui-details-motion')
    const state: DetailsState = { content }
    states.set(details, state)

    const clicked = (event: MouseEvent) => onSummaryClick(event)
    const toggled = (event: Event) => onToggle(event)
    details.addEventListener('click', clicked)
    details.addEventListener('toggle', toggled)

    cleanups.set(details, () => {
      details.removeEventListener('click', clicked)
      details.removeEventListener('toggle', toggled)
      cancelAnimation(state)
      clearAnimationStyles(content)
    })
  },
  unmounted(details) {
    cleanups.get(details)?.()
    cleanups.delete(details)
    states.delete(details)
  },
}
