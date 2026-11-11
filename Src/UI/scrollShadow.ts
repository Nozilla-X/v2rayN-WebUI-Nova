import type { Directive } from 'vue'

/*
 * Sticky action columns draw a soft edge only while they actually cover
 * content. A shadow on a table that already fits (or is scrolled to its end)
 * reads as a stray glow in dark mode, so track both states on the scroll
 * container and let CSS gate the shadow on `.is-scrollable-x:not(.is-scroll-end)`.
 */
const cleanups = new WeakMap<HTMLElement, () => void>()

function update(el: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth
  const scrollable = max > 1
  el.classList.toggle('is-scrollable-x', scrollable)
  el.classList.toggle('is-scroll-end', scrollable && el.scrollLeft >= max - 1)
}

export const vScrollShadow: Directive<HTMLElement> = {
  mounted(el) {
    if (typeof ResizeObserver === 'undefined') return
    const run = () => update(el)
    const observer = new ResizeObserver(run)
    observer.observe(el)
    const table = el.querySelector('table')
    if (table) observer.observe(table)
    el.addEventListener('scroll', run, { passive: true })
    window.addEventListener('resize', run)
    cleanups.set(el, () => {
      observer.disconnect()
      el.removeEventListener('scroll', run)
      window.removeEventListener('resize', run)
    })
    run()
  },
  updated(el) {
    update(el)
  },
  unmounted(el) {
    cleanups.get(el)?.()
    cleanups.delete(el)
  },
}
