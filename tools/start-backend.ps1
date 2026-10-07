$ErrorActionPreference = 'Stop'
try {
    . (Join-Path $PSScriptRoot '_load-env.ps1')
    Initialize-BackendEnvironment
    Invoke-LocalProcess -Executable (Join-Path (Get-Location).Path 'venv/Scripts/python.exe') -Arguments '-m uvicorn main:app --port 8000' -ServiceName 'Backend'
} catch { Write-Host 'Backend could not run. Check local configuration, required DB_* settings and Python privately. No values were printed.'; exit 1 }
