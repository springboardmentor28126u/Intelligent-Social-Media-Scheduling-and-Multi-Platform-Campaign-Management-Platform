import { PlatformIcon } from './PlatformBadge'
import { Loader2, Unlink, Link2 } from 'lucide-react'

export const AccountCard = ({
  platform,
  isConnected,
  accountData,
  onConnect,
  onDisconnect,
  isLoading = false,
  canManage = false, setupRequired,
}) => {
  const getPlatformDetails = (p) => {
    switch ((p || '').toLowerCase()) {
      case 'instagram':
        return {
          title: 'Instagram',
          category: 'Visual Content',
          accentClass: 'platform-card-instagram',
          iconBg: 'bg-instagram',
          desc: 'Manage the Instagram account connected to this workspace.',
        }
      case 'facebook':
        return {
          title: 'Facebook',
          category: 'Pages & Communities',
          accentClass: 'platform-card-facebook',
          iconBg: 'bg-facebook',
          desc: 'Manage the Facebook account connected to this workspace.',
        }
      case 'linkedin':
        return {
          title: 'LinkedIn',
          category: 'Professional Network',
          accentClass: 'platform-card-linkedin',
          iconBg: 'bg-linkedin',
          desc: 'Manage the LinkedIn account connected to this workspace.',
        }
      case 'youtube':
        return {
          title: 'YouTube',
          category: 'Video Channel',
          accentClass: 'platform-card-youtube',
          iconBg: 'bg-youtube',
          desc: 'Upload videos to the YouTube channel connected to this workspace.',
        }
      case 'x':
      case 'twitter':
        return {
          title: 'X (formerly Twitter)',
          category: 'Posts & Threads',
          accentClass: 'platform-card-x',
          iconBg: 'bg-x',
          desc: 'Manage the X account connected to this workspace.',
        }
      default:
        return {
          title: platform,
          category: 'Social Channel',
          accentClass: '',
          iconBg: 'bg-indigo',
          desc: 'Manage the social account connected to this workspace.',
        }
    }
  }

  const details = getPlatformDetails(platform)

  return (
    <div className={`social-account-card ${isConnected ? 'is-connected' : ''} ${details.accentClass}`}>
      <div className="card-top">
        <div className={`platform-logo-box ${details.iconBg}`}>
          <PlatformIcon platform={platform} size={24} />
        </div>
        <div className="connection-status-pill">
          {isConnected ? (
            <span className="status-live">
              <span className="status-dot live" />
              Connected
            </span>
          ) : (
            <span className="status-offline">
              <span className="status-dot offline" />
              Not Connected
            </span>
          )}
        </div>
      </div>

      <div className="card-middle">
        <h3 className="platform-title">{details.title}</h3>
        <span className="platform-category">{details.category}</span>
        <p className="platform-description">{details.desc}</p>
      </div>

      {isConnected && (
        <div className="connected-metadata">
          <div className="meta-row">
            <span className="meta-label">Account Name:</span>
            <span className="meta-value font-medium">{accountData?.account_name || `${platform} Account`}</span>
          </div>
          {accountData?.id && (
            <div className="meta-row">
              <span className="meta-label">Account ID:</span>
              <span className="meta-value font-mono">#{accountData.id}</span>
            </div>
          )}
        </div>
      )}

      <div className="card-actions-row">
        {isConnected ? (
          <button
            type="button"
            className="btn btn-danger-outline w-full"
            onClick={() => onDisconnect(accountData)}
            disabled={isLoading || !canManage}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <Unlink size={16} />
                <span>Disconnect Account</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => onConnect(platform)}
            disabled={isLoading || !canManage || !!setupRequired}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Link2 size={16} />
                <span>Connect {details.title}</span>
              </>
            )}
          </button>
        )}
      </div>
      {setupRequired && <p className="platform-description" role="status">Connection setup required: {setupRequired}</p>}
      {isConnected && canManage && <button className="btn btn-ghost" disabled={isLoading || !!setupRequired} onClick={() => onConnect(platform)}>Reconnect / authorize another account</button>}
    </div>
  )
}

export default AccountCard
