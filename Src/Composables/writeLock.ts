// Application-wide mutex for settings writes. Independent pages can issue
// writes against overlapping backend settings, so their requests must not
// race: each task starts only after the previous one settles.
export function createWriteLock() {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(task, task)
      tail = result.then(() => undefined, () => undefined)
      return result
    },
  }
}

export type WriteLock = ReturnType<typeof createWriteLock>
