import type { Directive } from 'vue'

/*
 * Native <details> elements snap unless the browser can interpolate the
 * ::details-content block size, which is still uneven across engines. The
 * directive below animates an explicit content wrapper with the Web Animations
 * API, so every disclosure uses the same timing and easing. It also scrolls
 * an expanded section into view when its content would overflow the scrollport,
 * which keeps long editors (routing JSON, DNS JSON, advanced rule JSON) from
 * opening entirely below the fold.
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
  ignoreClose: boolean
}

const states = new WeakMap<HTMLDetailsElement, DetailsState>()
const cleanups = new WeakMap<HTMLDetailsElement, () => void>()

type DetailsToggleEvent = Event & { newState: 'open' | 'closed' }

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

function animate(details: HTMLDetailsElement, state: DetailsState, opening: boolean, event?: Event): void {
  if (prefersReducedMotion()) {
    clearAnimationStyles(state.content)
    if (opening) scrollDisclosureIntoView(details, state.content)
    return
  }
  if (state.animation) {
    event?.preventDefault()
    return
  }

  if (!opening) {
    const current = state.content.getBoundingClientRect().height
    if (current <= 0) return
    event?.preventDefault()
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
      state.ignoreClose = true
      details.open = false
    }
    return
  }

  // Measure before pinning the wrapper at zero: an overflow-hidden box still
  // reports its full scroll height, so the target stays exact.
  const target = state.content.scrollHeight
  if (target <= 0) return
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

function onBeforeToggle(event: Event): void {
  const details = event.currentTarget as HTMLDetailsElement
  const state = states.get(details)
  if (!state) return
  const toggle = event as DetailsToggleEvent
  if (toggle.newState === 'open') {
    if (prefersReducedMotion()) return
    if (state.animation) {
      event.preventDefault()
      return
    }
    // Pin the body before the browser paints the opened state, so the first
    // frame starts at the summary edge instead of flashing full content.
    state.content.style.overflow = 'hidden'
    state.content.style.height = '0px'
    state.content.style.willChange = 'height'
    return
  }
  if (toggle.newState !== 'closed' || state.ignoreClose) return
  animate(details, state, false, event)
}

function onToggle(event: Event): void {
  const details = event.currentTarget as HTMLDetailsElement
  const state = states.get(details)
  if (!state) return
  if (details.open) {
    if (state.ignoreClose) {
      state.ignoreClose = false
      return
    }
    animate(details, state, true)
    return
  }
  state.ignoreClose = false
  cancelAnimation(state)
  clearAnimationStyles(state.content)
}

export const vDetailsMotion: Directive<HTMLDetailsElement> = {
  mounted(details) {
    const content = details.querySelector<HTMLElement>(CONTENT_SELECTOR)
    if (!content) return
    details.classList.add('ui-details-motion')
    const state: DetailsState = { content, ignoreClose: false }
    states.set(details, state)

    const before = (event: Event) => onBeforeToggle(event)
    const toggled = (event: Event) => onToggle(event)
    details.addEventListener('beforetoggle', before)
    details.addEventListener('toggle', toggled)

    // Older engines without beforetoggle can still animate closing by taking
    // over the summary click. Keyboard activation produces the same click.
    let clicked: ((event: MouseEvent) => void) | undefined
    if (!('onbeforetoggle' in HTMLDetailsElement.prototype)) {
      clicked = (event: MouseEvent) => {
        if (!details.open || prefersReducedMotion()) return
        const target = event.target as Element | null
        const summary = target?.closest('summary')
        if (!summary || summary.parentElement !== details) return
        animate(details, state, false, event)
      }
      details.addEventListener('click', clicked)
    }

    cleanups.set(details, () => {
      details.removeEventListener('beforetoggle', before)
      details.removeEventListener('toggle', toggled)
      if (clicked) details.removeEventListener('click', clicked)
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
