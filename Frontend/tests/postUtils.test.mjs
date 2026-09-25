import test from 'node:test'
import assert from 'node:assert/strict'
import { isPending, localFields, postCampaign, scheduledInstant, statusLabel } from '../src/postUtils.js'

test('calendar keeps due but unprocessed posts scheduled', () => {
  const job = { post_id: 1, status: 'scheduled', provider: 'instagram', scheduled_at: '2000-01-01T00:00:00Z' }
  const result = postCampaign({ id: 1, title: 'Pending', status: 'scheduled' }, [job])
  assert.equal(result.status, 'scheduled')
  assert.equal(result.platform, 'Instagram')
  assert.equal(isPending(result.status), true)
})
test('selects next active occurrence, ignoring cancelled history and other posts', () => {
  const result = postCampaign({ id: 1, title: 'Recurring', status: 'scheduled' }, [
    { post_id: 1, status: 'cancelled', scheduled_at: '2030-01-01T10:00:00Z' },
    { post_id: 2, status: 'scheduled', scheduled_at: '2030-01-01T10:00:00Z' },
    { post_id: 1, status: 'scheduled', scheduled_at: '2030-01-03T10:00:00Z' },
    { post_id: 1, status: 'retry', scheduled_at: '2030-01-02T10:00:00Z' },
  ])
  assert.deepEqual({ date: result.date, time: result.time }, localFields('2030-01-02T10:00:00Z'))
  assert.equal(result.jobs.length, 3)
})
test('drafts remain unscheduled and failed posts are not marked published', () => {
  assert.equal(postCampaign({ id: 1, title: 'Draft', status: 'draft' }, []).date, '')
  const restored = postCampaign({ id: 1, title: 'Restored', status: 'draft' }, [
    { post_id: 1, status: 'cancelled', scheduled_at: '2030-01-01T10:00:00Z' },
  ])
  assert.equal(restored.date, '')
  assert.equal(restored.time, '')
  assert.equal(restored.jobs.length, 1)
  assert.equal(isPending('failed'), false)
  assert.equal(statusLabel('partially_published'), 'Partially published')
})
test('schedule validation rejects past or nonexistent calendar dates', () => {
  assert.throws(() => scheduledInstant('', '10:00'))
  assert.throws(() => scheduledInstant('2000-01-01', '10:00'))
  assert.throws(() => scheduledInstant('2030-02-30', '10:00'))
  assert.deepEqual(localFields(scheduledInstant('2090-01-02', '09:30')), { date: '2090-01-02', time: '09:30' })
})
test('status tones separate success, failure, idle and pending states', async () => {
  const { statusTone } = await import('../src/postUtils.js')
  assert.equal(statusTone('published'), 'success')
  assert.equal(statusTone('failed'), 'danger')
  assert.equal(statusTone('partially_published'), 'danger')
  assert.equal(statusTone('cancelled'), 'muted')
  assert.equal(statusTone('draft'), 'muted')
  assert.equal(statusTone('scheduled'), 'pending')
})
