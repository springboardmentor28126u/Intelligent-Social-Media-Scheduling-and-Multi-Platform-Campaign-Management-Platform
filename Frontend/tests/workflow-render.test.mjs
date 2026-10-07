import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

let server
before(async () => {
  server = await createServer({ configFile: false, envDir: false, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
})
after(async () => { await server?.close() })
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))

test('post editor renders publishing controls only for creators', async () => {
  const { Campaigns } = await server.ssrLoadModule('/src/pages/Campaigns.jsx')
  const props = { showCampaignForm: true, canCreateCampaign: true, accountIds: [],
    platform: '', campaignName: '', content: '', imageUrl: '', videoUrl: '', recurrence: 'none',
    campaignDate: '', campaignTime: '', occurrences: 1 }
  const manager = render(Campaigns, { ...props, canPublish: false })
  assert.doesNotMatch(manager, />Publish now</)
  assert.doesNotMatch(manager, />Schedule Post</)
  assert.doesNotMatch(manager, /Schedule Date|Schedule Time|Schedule timezone/)
  assert.match(manager, />Send for approval</)
  assert.match(manager, /Only content creators/)
  const creator = render(Campaigns, { ...props, canPublish: true })
  assert.match(creator, />Publish now</)
  assert.match(creator, />Schedule Post</)
})

test('publishing details hides retry and shows an approval badge to read-only publishers', async () => {
  const { PublishingDetails } = await server.ssrLoadModule('/src/components/PublishingDetails.jsx')
  const post = { id: 1, name: 'Example', content: '', status: 'failed', approval_status: 'awaiting_creator',
    jobs: [{ id: 1, provider: 'facebook', status: 'failed', scheduled_at: '2026-10-04T10:00:00Z', attempts: 1 }] }
  const manager = render(PublishingDetails, { post, canManage: true, canPublish: false })
  assert.doesNotMatch(manager, />Retry</)
  assert.match(manager, /Awaiting creator/)
  assert.match(manager, /Only content creators/)
  assert.match(render(PublishingDetails, { post, canManage: true, canPublish: true }), />Retry</)
})

test('approval screen renders the creator queue', async () => {
  const { Approvals } = await server.ssrLoadModule('/src/pages/Approvals.jsx')
  const html = render(Approvals, { workspace: { id: 1, role: 'content_creator' }, user: { id: 1 } })
  assert.match(html, /Awaiting creator \(0\)/)
  assert.match(html, /Creator-authored revisions can publish directly/)
})

test('team cards distinguish management rights from publishing role', async () => {
  const { Teams } = await server.ssrLoadModule('/src/pages/Teams.jsx')
  const props = { user: { id: 1, role: 'content_creator' }, teams: [
    { id: 1, name: 'Creator owned', role: 'content_creator', can_manage: true, owner_id: 1, status: 'active' },
    { id: 2, name: 'Admin owned', role: 'administrator', can_manage: true, owner_id: 1, status: 'active' }] }
  const html = render(Teams, props)
  assert.match(html, /Can manage this team/)
  assert.match(html, /Can connect accounts and publish/)
  assert.match(html, /Cannot connect accounts or publish/)
})

const expectedNav = {
  content_creator: ['Overview', 'Campaigns', 'Posts', 'Schedule', 'Calendar', 'Social Accounts', 'Analytics', 'Engagement', 'Reports', 'Notifications', 'Teams', 'Content Approval'],
  marketing_manager: ['Overview', 'Campaigns', 'Posts', 'Content Approval', 'Analytics', 'Engagement', 'Reports', 'Notifications', 'Teams'],
  administrator: ['Overview', 'Campaigns', 'Posts', 'Analytics', 'Engagement', 'Reports', 'Notifications', 'Teams'],
  business_user: ['Overview', 'Campaigns', 'Posts', 'Analytics', 'Engagement', 'Reports', 'Notifications', 'Teams'],
}
for (const [role, expected] of Object.entries(expectedNav)) {
  test(`exact rendered navigation for ${role}`, async () => {
    const { Sidebar } = await server.ssrLoadModule('/src/components/Sidebar.jsx')
    for (const isTeam of [false, true]) {
      const html = render(Sidebar, { currentRole: role, isTeam })
      const labels = [...html.matchAll(/class="nav-label">([^<]+)</g)].map(m => m[1].replaceAll('&amp;', '&'))
      assert.deepEqual(labels, isTeam ? expected.filter(x => !['Users', 'Roles & Permissions'].includes(x)) : expected)
    }
  })
}

test('dashboard demo controls require publishing rights separately from drafting', async () => {
  const { Dashboard } = await server.ssrLoadModule('/src/pages/Dashboard.jsx')
  assert.doesNotMatch(render(Dashboard, { canCreateCampaign: true, canPublish: false }), /Load demo data/)
  assert.match(render(Dashboard, { canCreateCampaign: true, canPublish: true }), /Load demo data/)
})
