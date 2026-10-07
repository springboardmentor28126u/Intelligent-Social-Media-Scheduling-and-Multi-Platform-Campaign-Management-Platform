# Run manually with the API and both workers stopped. Never loads dotenv files.
param([string]$BackupDir = 'C:\SocialPilot_backups')
$ErrorActionPreference = 'Stop'
$migrationRoot = Split-Path -Parent $PSScriptRoot
$migrationPython = Join-Path $migrationRoot 'Backend/venv/Scripts/python.exe'
function Invoke-MigrationPython {
    param([string[]]$Arguments)
    # Windows PowerShell 5 treats normal native stderr (including Alembic INFO)
    # as errors under Stop. Suppress all streams and use the actual exit code.
    $migrationInvokePreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $migrationPython @Arguments *> $null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $migrationInvokePreference
    }
}
$migrationNames = @('DATABASE_URL', 'APP_ENV', 'PYTHON_DOTENV_DISABLED', 'BACKUP_DIR')
$migrationPrevious = @{}
foreach ($migrationName in $migrationNames) {
    $migrationPrevious[$migrationName] = [Environment]::GetEnvironmentVariable($migrationName, 'Process')
}
$migrationSucceeded = $false
$migrationSecret = $null
Push-Location (Join-Path $migrationRoot 'Backend')
try {
    if (-not (Test-Path -LiteralPath $migrationPython)) { throw 'Python unavailable' }
    $migrationSecret = Read-Host 'Paste the REAL LOCAL PostgreSQL DATABASE_URL (hidden; not the test database)' -AsSecureString
    $migrationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($migrationSecret)
    try {
        $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($migrationPointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($migrationPointer)
    }
    # This process only migrates; it does not start the API or require JWT/social keys.
    $env:APP_ENV = 'development'
    $env:PYTHON_DOTENV_DISABLED = '1'
    if ([string]::IsNullOrWhiteSpace($BackupDir)) { throw 'Backup directory is required' }
    $env:BACKUP_DIR = [IO.Path]::GetFullPath($BackupDir)
    $migrationPreflight = @'
import os
from sqlalchemy.engine import make_url
from alembic.config import Config
from alembic.script import ScriptDirectory
url = make_url(os.environ['DATABASE_URL'])
assert url.get_backend_name() in {'postgres', 'postgresql'}
assert url.host in {'localhost', '127.0.0.1', '::1'} and url.database and url.username
assert url.port != 55439 and url.username != 'socialpilot_test'
assert ScriptDirectory.from_config(Config('alembic.ini')).get_heads() == ['a21c4e810014']
'@
    $migrationExit = Invoke-MigrationPython -Arguments @('-c', $migrationPreflight)
    if ($migrationExit -ne 0) { throw 'Local target or migration head check failed' }
    [IO.Directory]::CreateDirectory($env:BACKUP_DIR) | Out-Null
    # The existing script aborts before migration when pg_dump fails. Suppress
    # diagnostic output here because driver exceptions may contain connection data.
    $migrationExit = Invoke-MigrationPython -Arguments @('./backup_and_migrate.py')
    if ($migrationExit -ne 0) { throw 'Backup, migration or schema verification failed' }
    $migrationVerify = @'
from database import engine
from alembic.runtime.migration import MigrationContext
with engine.connect() as connection:
    assert MigrationContext.configure(connection).get_current_heads() == ('a21c4e810014',)
'@
    $migrationExit = Invoke-MigrationPython -Arguments @('-c', $migrationVerify)
    if ($migrationExit -ne 0) { throw 'Database revision verification failed' }
    $migrationSucceeded = $true
    Write-Host 'SUCCESS: backup created in the selected backup directory; database migrated to a21c4e810014; schema verified.' -ForegroundColor Green
    Write-Host 'API and workers were not started. Review queued jobs before restarting workers.'
} catch {
    Write-Host 'FAILURE: migration was not fully verified. Keep API/workers stopped. Preserve the backups folder; do not assume changes were rolled back.' -ForegroundColor Red
    Write-Host 'Check your local database URL, PostgreSQL tools and migration head privately. No connection details were printed.'
} finally {
    foreach ($migrationName in $migrationNames) {
        if ($null -eq $migrationPrevious[$migrationName]) {
            # Remove only a process environment entry, never a filesystem file.
            Remove-Item -LiteralPath ('Env:' + $migrationName) -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($migrationName, $migrationPrevious[$migrationName], 'Process')
        }
    }
    if ($null -ne $migrationSecret) { $migrationSecret.Dispose() }
    Pop-Location
}
if (-not $migrationSucceeded) { exit 1 }
exit 0
