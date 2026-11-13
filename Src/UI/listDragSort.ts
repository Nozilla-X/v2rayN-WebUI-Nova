import { nextTick, ref, type Ref } from 'vue'

interface ListDragSortOptions {
  /** Scroll container that holds the rendered items. */
  container: Ref<HTMLElement | null>
  /** Selector matching a draggable item; the item must carry `data-list-drag-id`. */
  itemSelector: string
  /** The current id order. */
  getIds: () => string[]
  /** Called with the live order while dragging so the list rearranges itself. */
  onReorder: (ids: string[]) => void
  /** Called once on release with the final order. */
  onDrop?: (ids: string[], draggedId: string) => void
  /** Called when the drag is cancelled (Escape or pointercancel). */
  onCancel?: () => void
}

interface DragSession {
  pointerId: number
  startX: number
  startY: number
  pointerY: number
  item: HTMLElement
  itemId: string
  startRect: DOMRect
  originalIds: string[]
  scroller: HTMLElement | null
  active: boolean
  ghost?: HTMLElement
  raf: number
  reduceMotion: boolean
}

const FLIP_DURATION_MS = 200
const FLIP_EASING = 'cubic-bezier(0.2, 0, 0, 1)'
const DRAG_START_DISTANCE = 4
const AUTO_SCROLL_EDGE = 56
const AUTO_SCROLL_STEP = 10

/**
 * Pointer-driven list reordering. The dragged item is lifted into a fixed
 * ghost while a placeholder keeps its slot; crossing another item's midpoint
 * reports a live order so the caller can rearrange its own state. The ghost
 * clips nothing, so it works for both cards and compact member rows.
 */
export function useListDragSort(options: ListDragSortOptions) {
  const draggingId = ref('')
  const isDragging = ref(false)
  let session: DragSession | null = null
  let flipSequence = 0
  const flipTokens = new WeakMap<HTMLElement, number>()

  function begin(event: PointerEvent, itemId: string) {
    if (session || (event.pointerType === 'mouse' && event.button !== 0)) return
    const handle = event.currentTarget as HTMLElement | null
    const item = handle?.closest<HTMLElement>(options.itemSelector)
    const container = options.container.value
    if (!handle || !item || !container) return
    event.preventDefault()
    const rect = item.getBoundingClientRect()
    session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerY: event.clientY,
      item,
      itemId,
      startRect: rect,
      originalIds: [...options.getIds()],
      scroller: scrollParent(container),
      active: false,
      raf: 0,
      reduceMotion: prefersReducedMotion(),
    }
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeydown, true)
  }

  function activate(s: DragSession) {
    s.active = true
    isDragging.value = true
    draggingId.value = s.itemId
    s.ghost = createGhost(s.item, s.startRect)
    updateGhost(s)
    document.body.classList.add('nova-list-dragging')
    s.raf = requestAnimationFrame(() => autoScroll(s))
  }

  function createGhost(item: HTMLElement, rect: DOMRect): HTMLElement {
    const ghost = item.cloneNode(true) as HTMLElement
    ghost.classList.remove('is-drag-source')
    ghost.classList.add('list-drag-ghost')
    ghost.removeAttribute('id')
    ghost.removeAttribute('tabindex')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
    ghost.querySelectorAll('button, input, md-checkbox').forEach((element) => element.setAttribute('tabindex', '-1'))
    ghost.style.position = 'fixed'
    ghost.style.top = `${rect.top}px`
    ghost.style.left = `${rect.left}px`
    ghost.style.width = `${rect.width}px`
    ghost.style.height = `${rect.height}px`
    ghost.style.margin = '0'
    ghost.style.boxSizing = 'border-box'
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '1200'
    ghost.style.willChange = 'transform'
    document.body.appendChild(ghost)
    return ghost
  }

  function updateGhost(s: DragSession) {
    if (s.ghost) s.ghost.style.transform = `translate3d(0, ${s.pointerY - s.startY}px, 0)`
  }

  /**
   * Layout position of an item without its in-flight FLIP translation.
   * Measuring the animated rect would make the insertion decision depend on
   * when during the 200 ms shift the pointer happened to move.
   */
  function layoutTop(item: HTMLElement): number {
    const top = item.getBoundingClientRect().top
    const transform = getComputedStyle(item).transform
    if (!transform || transform === 'none') return top
    try {
      return top - new DOMMatrixReadOnly(transform).m42
    } catch {
      return top
    }
  }

  function updateOrder(s: DragSession) {
    const container = options.container.value
    if (!container) return
    const ids = options.getIds()
    if (!ids.includes(s.itemId)) return
    const draggedCenter = s.startRect.top + (s.pointerY - s.startY) + s.startRect.height / 2
    const items = [...container.querySelectorAll<HTMLElement>(options.itemSelector)]
      .filter((item) => item.dataset.listDragId !== s.itemId)
    let insertion = 0
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      if (layoutTop(item) + rect.height / 2 < draggedCenter) insertion += 1
    }
    const remaining = ids.filter((id) => id !== s.itemId)
    const next = [...remaining.slice(0, insertion), s.itemId, ...remaining.slice(insertion)]
    if (next.every((id, index) => id === ids[index])) return
    const previous = captureTops(container)
    options.onReorder(next)
    void flipItems(container, previous, s.itemId, s.reduceMotion)
  }

  function captureTops(container: HTMLElement): Map<string, number> {
    const tops = new Map<string, number>()
    for (const item of container.querySelectorAll<HTMLElement>(options.itemSelector)) {
      const id = item.dataset.listDragId
      if (id) tops.set(id, layoutTop(item))
    }
    return tops
  }

  async function flipItems(container: HTMLElement, previous: Map<string, number>, draggedId: string, reduceMotion: boolean) {
    await nextTick()
    if (reduceMotion) return
    for (const item of container.querySelectorAll<HTMLElement>(options.itemSelector)) {
      const id = item.dataset.listDragId
      if (!id || id === draggedId) continue
      const before = previous.get(id)
      if (before === undefined) continue
      const delta = before - layoutTop(item)
      if (Math.abs(delta) < 1) continue
      const token = ++flipSequence
      flipTokens.set(item, token)
      item.style.transition = 'none'
      item.style.transform = `translateY(${delta}px)`
      item.style.willChange = 'transform'
      requestAnimationFrame(() => {
        if (flipTokens.get(item) !== token) return
        item.style.transition = `transform ${FLIP_DURATION_MS}ms ${FLIP_EASING}`
        item.style.transform = ''
        item.addEventListener('transitionend', () => {
          if (flipTokens.get(item) !== token) return
          item.style.transition = ''
          item.style.willChange = ''
        }, { once: true })
      })
    }
  }

  function autoScroll(s: DragSession) {
    if (session !== s || !s.active) return
    const scroller = s.scroller
    if (scroller) {
      const rect = scroller.getBoundingClientRect()
      let delta = 0
      if (s.pointerY < rect.top + AUTO_SCROLL_EDGE) delta = -AUTO_SCROLL_STEP
      else if (s.pointerY > rect.bottom - AUTO_SCROLL_EDGE) delta = AUTO_SCROLL_STEP
      if (delta) {
        const before = scroller.scrollTop
        scroller.scrollTop = before + delta
        if (scroller.scrollTop !== before) updateOrder(s)
      }
    }
    s.raf = requestAnimationFrame(() => autoScroll(s))
  }

  function finish(s: DragSession) {
    const ids = [...options.getIds()]
    cleanup(s)
    options.onDrop?.(ids, s.itemId)
  }

  function cancel(s: DragSession) {
    cleanup(s)
    options.onCancel?.()
  }

  function cleanup(s: DragSession) {
    s.active = false
    if (s.raf) cancelAnimationFrame(s.raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('keydown', onKeydown, true)
    s.ghost?.remove()
    document.body.classList.remove('nova-list-dragging')
    draggingId.value = ''
    isDragging.value = false
    session = null
  }

  function onPointerMove(event: PointerEvent) {
    const s = session
    if (!s || event.pointerId !== s.pointerId) return
    s.pointerY = event.clientY
    if (!s.active) {
      if (Math.hypot(event.clientX - s.startX, event.clientY - s.startY) < DRAG_START_DISTANCE) return
      activate(s)
    }
    event.preventDefault()
    updateGhost(s)
    updateOrder(s)
  }

  function onPointerUp(event: PointerEvent) {
    const s = session
    if (!s || event.pointerId !== s.pointerId) return
    if (s.active) {
      s.pointerY = event.clientY
      finish(s)
    } else cleanup(s)
  }

  function onPointerCancel() {
    if (session) cancel(session)
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !session) return
    event.preventDefault()
    cancel(session)
  }

  return {
    draggingId,
    isDragging,
    begin,
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** The nearest ancestor the pointer can scroll while dragging. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return document.scrollingElement as HTMLElement | null
}
