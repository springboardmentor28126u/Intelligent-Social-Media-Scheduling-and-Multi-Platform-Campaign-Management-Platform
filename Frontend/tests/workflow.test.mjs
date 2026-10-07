import test from 'node:test'
import assert from 'node:assert/strict'
import { canPublish, reviewActions, approvalLabel } from '../src/workflowPolicy.js'

test('publishing controls are creator-only, including owners using admin role', () => {
  assert.equal(canPublish('content_creator'), true)
  for (const role of ['administrator', 'marketing_manager', 'business_user', undefined]) assert.equal(canPublish(role), false)
})
test('manager review and creator final approval are distinct UI stages', () => {
  assert.deepEqual(reviewActions('marketing_manager', 'draft'), ['approve', 'reject'])
  assert.deepEqual(reviewActions('marketing_manager', 'awaiting_creator'), [])
  assert.deepEqual(reviewActions('administrator', 'awaiting_creator', true), [])
  assert.deepEqual(reviewActions('content_creator', 'awaiting_creator'), ['approve', 'reject'])
  assert.deepEqual(reviewActions('content_creator', 'pending'), [])
  assert.deepEqual(reviewActions('business_user', 'draft'), [])
})
test('approval badges clearly name pending and final review states', () => {
  assert.equal(approvalLabel('awaiting_creator'), 'Awaiting creator')
  assert.equal(approvalLabel('pending'), 'Awaiting manager')
  assert.equal(approvalLabel('approved'), 'Creator approved')
})

test('view-only roles cannot review even with team management rights', () => {
  for (const role of ['business_user', 'administrator']) for (const status of ['draft', 'pending', 'awaiting_creator', 'rejected']) assert.deepEqual(reviewActions(role, status, true), [])
})
