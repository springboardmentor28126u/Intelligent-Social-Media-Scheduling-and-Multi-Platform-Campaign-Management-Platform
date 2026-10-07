import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('production entry does not preload the chart library', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /<link[^>]+modulepreload[^>]+charts-/)
  assert.match(html, /react-vendor-/)
})
