let nextId = 1
const openDialogs: number[] = []

export function enterDialog(): number {
  const id = nextId++
  openDialogs.push(id)
  document.body.classList.add('nova-dialog-open')
  return id
}

export function exitDialog(id: number): void {
  const index = openDialogs.indexOf(id)
  if (index >= 0) openDialogs.splice(index, 1)
  if (!openDialogs.length) document.body.classList.remove('nova-dialog-open')
}

export function isTopDialog(id: number): boolean {
  return openDialogs[openDialogs.length - 1] === id
}

export function resetDialogLayers(): void {
  openDialogs.length = 0
  document.body.classList.remove('nova-dialog-open')
}
