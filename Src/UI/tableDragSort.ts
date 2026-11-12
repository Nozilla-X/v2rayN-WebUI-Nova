import { computed, nextTick, ref, type Ref } from 'vue'

interface TableDragSortOptions {
  /** Scroll container that also holds the rendered rows. */
  container: Ref<HTMLElement | null>
  /** Selector matching a draggable row; the row must carry `data-drag-row-key`. */
  rowSelector: string
  /** The visually rendered order, including the dragged row. */
  getVisibleIds: () => string[]
  /** Called with the row the dragged item should be placed before or after. */
  onDrop: (draggedId: string, targetId: string, after: boolean) => void | Promise<void>
}

interface DragSession {
  pointerId: number
  startX: number
  startY: number
  pointerY: number
  row: HTMLElement
  rowId: string
  active: boolean
  startRowTop: number
  rowHeight: number
  lastIndex: number
  ghost?: HTMLElement
  raf: number
  reduceMotion: boolean
}

const FLIP_DURATION_MS = 200
const FLIP_EASING = 'cubic-bezier(0.2, 0, 0, 1)'
const DRAG_START_DISTANCE = 4
const AUTO_SCROLL_EDGE = 56
const AUTO_SCROLL_STEP = 10
const placeholderRowKey = '__placeholder__'

/**
 * Pointer-driven table reordering with a lifted row, a dashed placeholder and
 * spring-like FLIP shifts for the remaining rows. It deliberately keeps the
 * rendered order stable while dragging: the page hides the dragged row and
 * renders the placeholder at `placeholderIndex`, then reports the final
 * before/after pair so the caller can build its own API payload.
 */
export function useTableDragSort(options: TableDragSortOptions) {
  const draggingId = ref('')
  const placeholderIndex = ref(-1)
  const rowHeight = ref(0)
  const isDragging = computed(() => Boolean(draggingId.value))
  let session: DragSession | null = null
  let flipSequence = 0
  const flipTokens = new WeakMap<HTMLElement, number>()

  function begin(event: PointerEvent, rowId: string) {
    if (session || (event.pointerType === 'mouse' && event.button !== 0)) return
    const handle = event.currentTarget as HTMLElement | null
    const row = handle?.closest<HTMLElement>(options.rowSelector)
    const container = options.container.value
    if (!handle || !row || !container) return
    event.preventDefault()
    const rect = row.getBoundingClientRect()
    session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerY: event.clientY,
      row,
      rowId,
      active: false,
      startRowTop: rect.top,
      rowHeight: rect.height,
      lastIndex: options.getVisibleIds().indexOf(rowId),
      raf: 0,
      reduceMotion: typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
    }
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeydown, true)
  }

  function activate(s: DragSession) {
    s.active = true
    draggingId.value = s.rowId
    placeholderIndex.value = Math.max(0, s.lastIndex)
    rowHeight.value = s.rowHeight
    s.ghost = createGhost(s.row)
    updateGhost(s)
    options.container.value?.classList.add('is-drag-sorting')
    document.body.classList.add('nova-table-dragging')
    s.raf = requestAnimationFrame(() => autoScroll(s))
    void nextTick(() => {
      if (session === s) updatePlaceholder(s)
    })
  }

  function createGhost(row: HTMLElement): HTMLElement {
    const table = row.closest('table')
    const rect = row.getBoundingClientRect()
    const tableRect = table?.getBoundingClientRect()
    const widths = table
      ? [...table.querySelectorAll<HTMLElement>('thead th')].map((cell) => cell.getBoundingClientRect().width)
      : []
    const shell = document.createElement('div')
    shell.className = 'table-drag-ghost-shell'
    shell.style.top = `${rect.top}px`
    shell.style.left = `${tableRect?.left ?? rect.left}px`
    shell.style.width = `${tableRect?.width ?? rect.width}px`
    shell.setAttribute('aria-hidden', 'true')

    const ghostTable = document.createElement('table')
    ghostTable.className = 'data-table table-drag-ghost'
    ghostTable.style.width = '100%'
    ghostTable.style.tableLayout = 'fixed'
    const body = document.createElement('tbody')
    const clone = row.cloneNode(true) as HTMLTableRowElement
    clone.removeAttribute('id')
    clone.removeAttribute('tabindex')
    clone.removeAttribute('aria-selected')
    clone.removeAttribute('aria-current')
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
    clone.querySelectorAll('button, input, md-checkbox').forEach((element) => element.setAttribute('tabindex', '-1'))
    ;[...clone.children].forEach((cell, index) => {
      const element = cell as HTMLElement
      if (widths[index]) element.style.width = `${widths[index]}px`
      element.style.boxSizing = 'border-box'
    })
    clone.style.height = `${rect.height}px`
    body.appendChild(clone)
    ghostTable.appendChild(body)
    shell.appendChild(ghostTable)
    document.body.appendChild(shell)
    return shell
  }

  function updateGhost(s: DragSession) {
    if (s.ghost) s.ghost.style.transform = `translate3d(0, ${s.pointerY - s.startY}px, 0) scale(1.015)`
  }

  /**
   * The layout position of a row without its in-flight FLIP translation.
   * Measuring the animated rect would make the placeholder decision depend on
   * when during the 200 ms shift the pointer happened to move.
   */
  function layoutTop(row: HTMLElement): number {
    const top = row.getBoundingClientRect().top
    const transform = getComputedStyle(row).transform
    if (!transform || transform === 'none') return top
    try {
      return top - new DOMMatrixReadOnly(transform).m42
    } catch {
      return top
    }
  }

  function placeholderIndexFor(s: DragSession): number {
    const container = options.container.value
    if (!container) return 0
    const rows = [...container.querySelectorAll<HTMLElement>(options.rowSelector)]
    const draggedCenter = s.startRowTop + (s.pointerY - s.startY) + s.rowHeight / 2
    let index = 0
    for (const row of rows) {
      const rect = row.getBoundingClientRect()
      if (layoutTop(row) + rect.height / 2 < draggedCenter) index += 1
    }
    return Math.max(0, Math.min(index, rows.length))
  }

  function updatePlaceholder(s: DragSession) {
    const container = options.container.value
    if (!container) return
    const index = placeholderIndexFor(s)
    if (index === s.lastIndex) return
    const previous = captureRowTops(container)
    s.lastIndex = index
    placeholderIndex.value = index
    void flipRows(container, previous, s.reduceMotion)
  }

  function captureRowTops(container: HTMLElement): Map<string, number> {
    const tops = new Map<string, number>()
    for (const row of container.querySelectorAll<HTMLElement>('[data-drag-row-key]')) {
      const key = row.dataset.dragRowKey
      if (key) tops.set(key, row.getBoundingClientRect().top)
    }
    return tops
  }

  async function flipRows(container: HTMLElement, previous: Map<string, number>, reduceMotion: boolean) {
    await nextTick()
    if (reduceMotion) return
    for (const row of container.querySelectorAll<HTMLElement>('[data-drag-row-key]')) {
      const key = row.dataset.dragRowKey
      const before = key ? previous.get(key) : undefined
      if (before === undefined) continue
      const delta = before - row.getBoundingClientRect().top
      if (Math.abs(delta) < 1) continue
      const token = ++flipSequence
      flipTokens.set(row, token)
      row.style.transition = 'none'
      row.style.transform = `translateY(${delta}px)`
      row.style.willChange = 'transform'
      requestAnimationFrame(() => {
        if (flipTokens.get(row) !== token) return
        row.style.transition = `transform ${FLIP_DURATION_MS}ms ${FLIP_EASING}`
        row.style.transform = ''
        row.addEventListener('transitionend', () => {
          if (flipTokens.get(row) !== token) return
          row.style.transition = ''
          row.style.willChange = ''
        }, { once: true })
      })
    }
  }

  function autoScroll(s: DragSession) {
    if (session !== s || !s.active) return
    const container = options.container.value
    if (container) {
      const rect = container.getBoundingClientRect()
      let delta = 0
      if (s.pointerY < rect.top + AUTO_SCROLL_EDGE) delta = -AUTO_SCROLL_STEP
      else if (s.pointerY > rect.bottom - AUTO_SCROLL_EDGE) delta = AUTO_SCROLL_STEP
      if (delta) {
        const before = container.scrollTop
        container.scrollTop = before + delta
        if (container.scrollTop !== before) updatePlaceholder(s)
      }
    }
    s.raf = requestAnimationFrame(() => autoScroll(s))
  }

  function finish(s: DragSession) {
    const visible = options.getVisibleIds()
    const remaining = visible.filter((id) => id !== s.rowId)
    const index = Math.max(0, Math.min(placeholderIndexFor(s), remaining.length))
    const next = [...remaining.slice(0, index), s.rowId, ...remaining.slice(index)]
    const changed = next.some((id, position) => id !== visible[position])
    cleanup(s)
    if (!changed) return
    const targetAfter = remaining[index]
    const targetBefore = remaining[index - 1]
    if (targetAfter !== undefined) void options.onDrop(s.rowId, targetAfter, false)
    else if (targetBefore !== undefined) void options.onDrop(s.rowId, targetBefore, true)
  }

  function cleanup(s: DragSession) {
    s.active = false
    if (s.raf) cancelAnimationFrame(s.raf)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('keydown', onKeydown, true)
    s.ghost?.remove()
    options.container.value?.classList.remove('is-drag-sorting')
    document.body.classList.remove('nova-table-dragging')
    draggingId.value = ''
    placeholderIndex.value = -1
    rowHeight.value = 0
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
    updatePlaceholder(s)
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
    if (session) cleanup(session)
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !session) return
    event.preventDefault()
    cleanup(session)
  }

  return {
    draggingId,
    placeholderIndex,
    rowHeight,
    isDragging,
    placeholderRowKey,
    begin,
  }
}
