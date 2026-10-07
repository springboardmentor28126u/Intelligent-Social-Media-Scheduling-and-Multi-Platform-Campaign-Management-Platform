param([string]$TunnelHost)
$ErrorActionPreference = 'Stop'
try {
    if ([string]::IsNullOrWhiteSpace($TunnelHost)) {
        for ($tunnelPort = 20241; $tunnelPort -le 20250; $tunnelPort++) {
            try {
                $tunnelResponse = Invoke-RestMethod -Uri "http://127.0.0.1:$tunnelPort/quicktunnel" -TimeoutSec 1 -ErrorAction Stop
                if ($tunnelResponse.hostname) { $TunnelHost = [string]$tunnelResponse.hostname; break }
            } catch { }
        }
        if ([string]::IsNullOrWhiteSpace($TunnelHost)) { Write-Host 'The tunnel is not running. Start start-tunnel.ps1 first.'; exit 1 }
    }
    $tunnelNewHost = $TunnelHost.Trim() -creplace '^https://', ''
    $tunnelNewHost = $tunnelNewHost -creplace '/$', ''
    if ($tunnelNewHost -cnotmatch '^[a-z0-9-]+\.trycloudflare\.com$') { Write-Host 'Invalid tunnel host. Use a lowercase name.trycloudflare.com host or its HTTPS URL.'; exit 1 }
    $tunnelFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'Backend/.env.social.local'
    $tunnelEncoding = New-Object Text.UTF8Encoding($false, $true)
    $tunnelBytes = [IO.File]::ReadAllBytes($tunnelFile)
    $tunnelText = $tunnelEncoding.GetString($tunnelBytes)
    if ($tunnelText.Length -gt 0 -and [int][char]$tunnelText[0] -eq 0xFEFF) { $tunnelText = $tunnelText.Substring(1) }
    $tunnelEdits = @()
    foreach ($tunnelKey in @('INSTAGRAM_REDIRECT_URI', 'FACEBOOK_REDIRECT_URI')) {
        $tunnelPattern = '(?m)^' + $tunnelKey + '=(https://)([^/\r\n]+)(/[^\r\n]*)\r?$'
        $tunnelMatches = [regex]::Matches($tunnelText, $tunnelPattern)
        if ($tunnelMatches.Count -ne 1) { Write-Host 'Both redirect variables must appear exactly once as HTTPS callback URLs. Nothing was written.'; exit 1 }
        $tunnelHostGroup = $tunnelMatches[0].Groups[2]
        $tunnelEdits += [pscustomobject]@{ Index = $tunnelHostGroup.Index; Length = $tunnelHostGroup.Length }
    }
    foreach ($tunnelEdit in ($tunnelEdits | Sort-Object Index -Descending)) {
        $tunnelText = $tunnelText.Remove($tunnelEdit.Index, $tunnelEdit.Length).Insert($tunnelEdit.Index, $tunnelNewHost)
    }
    [IO.File]::WriteAllText($tunnelFile, $tunnelText, $tunnelEncoding)
    Write-Host "New host: $tunnelNewHost"
    Write-Host 'Updated: INSTAGRAM_REDIRECT_URI, FACEBOOK_REDIRECT_URI'
    Write-Host "Instagram: https://$tunnelNewHost/oauth/instagram/callback"
    Write-Host "Facebook: https://$tunnelNewHost/oauth/facebook/callback"
    Write-Host 'Restart the backend afterwards.'
} catch { Write-Host 'Tunnel settings could not be updated. Check file access and UTF-8 formatting privately. No configuration values were printed.'; exit 1 }
