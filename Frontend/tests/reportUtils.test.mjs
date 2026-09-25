import test from 'node:test'
import assert from 'node:assert/strict'
import { money, percent, toCsv } from '../src/reportUtils.js'

test('CSV export quotes fields and neutralises formulas', () => {
  const csv = toCsv([{ label: 'Name', value: 'name' }, { label: 'ROI', value: r => r.roi }], [{ name: '=cmd()', roi: 12.5 }, { name: 'Say "hi"', roi: null }])
  assert.equal(csv, '"Name","ROI"\r\n"\'=cmd()","12.5"\r\n"Say ""hi""",""')
})
test('formatting helpers handle empty values', () => {
  assert.equal(percent(null), '—')
  assert.equal(percent(40), '40%')
  assert.match(money(1500, 'INR'), /1,500/)
})
test('trend chip compares against the previous period', async () => {
  const { trendOf } = await import('../src/reportUtils.js')
  assert.deepEqual(trendOf(150, 100), { trend: '+50.0%', trendUp: true })
  assert.deepEqual(trendOf(50, 100), { trend: '-50.0%', trendUp: false })
  assert.deepEqual(trendOf(10, 0), { trend: 'New', trendUp: true })
  assert.deepEqual(trendOf(0, 0), {})
})
