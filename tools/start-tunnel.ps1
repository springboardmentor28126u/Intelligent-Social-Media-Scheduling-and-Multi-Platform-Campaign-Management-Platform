$ErrorActionPreference = 'Stop'
Write-Host 'The tunnel address changes on every start. Run set-tunnel-host.ps1 afterwards, then restart the backend.'
try {
    . (Join-Path $PSScriptRoot '_load-env.ps1')
    Invoke-LocalProcess -Executable (Join-Path $PSScriptRoot 'cloudflared.exe') -Arguments 'tunnel --url http://localhost:8000' -ServiceName 'Tunnel'
} catch { Write-Host 'Tunnel could not run. Check cloudflared availability privately. No service output was printed.'; exit 1 }
