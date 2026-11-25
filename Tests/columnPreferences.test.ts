import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultVisibleColumns,
  normalizeVisibleColumns,
} from '../Src/UI/columnPreferences.ts'

const COLUMNS = [
  { id: 'name', required: true },
  { id: 'url' },
  { id: 'rate' },
]

test('column preferences show every column by default', () => {
  assert.deepEqual(defaultVisibleColumns(COLUMNS), ['name', 'url', 'rate'])
})

test('stored column ids are untrusted and normalize to the declared order', () => {
  assert.deepEqual(normalizeVisibleColumns(['rate', 'url'], COLUMNS), ['name', 'url', 'rate'])
  assert.deepEqual(normalizeVisibleColumns(['rate', 'rate', 'ghost'], COLUMNS), ['name', 'rate'])
  assert.deepEqual(normalizeVisibleColumns([], COLUMNS), ['name'])
  assert.deepEqual(normalizeVisibleColumns([1, null, {}, 'url'], COLUMNS), ['name', 'url'])
})

test('required columns stay visible even after an empty or malformed preference', () => {
  assert.deepEqual(normalizeVisibleColumns(null, COLUMNS), ['name', 'url', 'rate'])
  assert.deepEqual(normalizeVisibleColumns('rate', COLUMNS), ['name', 'url', 'rate'])
  assert.deepEqual(normalizeVisibleColumns({ rate: true }, COLUMNS), ['name', 'url', 'rate'])
})
