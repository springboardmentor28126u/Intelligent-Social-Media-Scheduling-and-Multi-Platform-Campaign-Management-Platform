import { publishingMessage } from '../workflowPolicy'
import { ShieldCheck, Share2 } from 'lucide-react'
import { AccountCard } from '../components/AccountCard'

export const Accounts = ({
  connectedAccounts = [],
  onConnectAccount,
  onDisconnectAccount,
  loadingPlatform = null,
  providers = [], canManage = false,
}) => {
  const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'X', 'YouTube']

  const isAccountConnected = (platform) => {
    return connectedAccounts.some(
      (account) => account.connected && (account.platform || '').toLowerCase() === platform.toLowerCase()
    )
  }

  const getAccountData = (platform) => {
    return connectedAccounts.find(
      (account) => account.connected && (account.platform || '').toLowerCase() === platform.toLowerCase()
    )
  }

  return (
    <div className="accounts-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-main-heading">Social Accounts</h1>
          <p className="page-main-sub">
            Manage the social platforms connected to your workspace.
          </p>
        </div>

        <div className="connection-summary-badge">
          <Share2 size={16} className="text-emerald" />
          <span>
            {connectedAccounts.filter(a => a.connected).length} Accounts Connected
          </span>
        </div>
      </div>

      {!canManage && <p className="info-callout-card" role="status">{publishingMessage}</p>}
      {/* Info Banner */}
      <div className="info-callout-card">
        <div className="info-icon-wrap">
          <ShieldCheck size={20} className="text-indigo" />
        </div>
        <div className="info-content">
          <h4>Connected Accounts</h4>
          <p>
            Manage your connected social platforms from one place. Connected accounts remain available across sessions.
          </p>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="accounts-cards-grid">
        {PLATFORMS.map((platform) => {
          const connected = isAccountConnected(platform)
          const data = getAccountData(platform)
          return (
            <AccountCard
              key={platform}
              platform={platform}
              isConnected={connected}
              accountData={data}
              onConnect={onConnectAccount}
              onDisconnect={onDisconnectAccount}
              isLoading={loadingPlatform === platform}
              canManage={canManage}
              setupRequired={providers.find(p => p.provider === platform.toLowerCase())?.setup_required}
            />
          )
        })}
      </div>
      {connectedAccounts.filter(a => a.connected && a.id !== getAccountData(a.platform)?.id).map(account => <AccountCard key={account.id} platform={account.platform} isConnected accountData={account} onConnect={onConnectAccount} onDisconnect={onDisconnectAccount} canManage={canManage} isLoading={loadingPlatform === account.platform} />)}
    </div>
  )
}

export default Accounts
