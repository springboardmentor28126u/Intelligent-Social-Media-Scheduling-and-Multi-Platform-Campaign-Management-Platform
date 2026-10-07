$ErrorActionPreference = 'Stop'
try {
    . (Join-Path $PSScriptRoot '_load-env.ps1')
    Initialize-BackendEnvironment
    Invoke-LocalProcess -Executable (Join-Path (Get-Location).Path 'venv/Scripts/python.exe') -Arguments 'publishing_worker.py --interval 10' -ServiceName 'Publishing worker'
} catch { Write-Host 'Publishing worker could not run. Check local configuration, required DB_* settings and Python privately. No values were printed.'; exit 1 }
