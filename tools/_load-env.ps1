# Dot-source only defines helpers; callers explicitly load local configuration.
function Initialize-BackendEnvironment {
    $helperBackend = Join-Path (Split-Path -Parent $PSScriptRoot) 'Backend'
    try {
        foreach ($helperName in @('.env', '.env.social.local')) {
            $helperPath = Join-Path $helperBackend $helperName
            if (-not [IO.File]::Exists($helperPath)) { throw 'Missing configuration' }
            foreach ($helperLine in [IO.File]::ReadAllLines($helperPath)) {
                if ($helperLine -match '^\s*#' -or $helperLine -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') { continue }
                $helperKey = $Matches[1]
                $helperValue = $Matches[2].Trim()
                if ($helperValue.Length -ge 2 -and (($helperValue.StartsWith('"') -and $helperValue.EndsWith('"')) -or ($helperValue.StartsWith("'") -and $helperValue.EndsWith("'")))) {
                    $helperValue = $helperValue.Substring(1, $helperValue.Length - 2)
                }
                [Environment]::SetEnvironmentVariable($helperKey, $helperValue, 'Process')
            }
        }
        foreach ($helperKey in @('DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME')) {
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($helperKey, 'Process'))) { throw 'Missing DB setting' }
        }
        $helperPort = 0
        if (-not [int]::TryParse($env:DB_PORT, [ref]$helperPort) -or $helperPort -lt 1 -or $helperPort -gt 65535) { throw 'Invalid DB port' }
        if ($env:DB_HOST -notmatch '^[a-zA-Z0-9.\-]+$') { throw 'Invalid DB host' }
        $helperUser = [Uri]::EscapeDataString($env:DB_USER)
        $helperPassword = [Uri]::EscapeDataString($env:DB_PASSWORD)
        $helperDatabase = [Uri]::EscapeDataString($env:DB_NAME)
        $env:DATABASE_URL = 'postgresql://' + $helperUser + ':' + $helperPassword + '@' + $env:DB_HOST + ':' + $helperPort + '/' + $helperDatabase
        Set-Location -LiteralPath $helperBackend
    } catch {
        throw 'Local configuration could not be loaded. Check both backend configuration files and DB_USER, DB_PASSWORD, DB_HOST, DB_PORT and DB_NAME privately. No values were printed.'
    }
}

function Invoke-LocalProcess {
    param([string]$Executable, [string]$Arguments, [string]$ServiceName)
    $helperProcess = $null
    try {
        if (-not [IO.File]::Exists($Executable)) { throw 'Executable unavailable' }
        $helperInfo = New-Object Diagnostics.ProcessStartInfo
        $helperInfo.FileName = $Executable
        $helperInfo.Arguments = $Arguments
        $helperInfo.WorkingDirectory = (Get-Location).Path
        $helperInfo.UseShellExecute = $false
        $helperInfo.CreateNoWindow = $true
        $helperInfo.RedirectStandardOutput = $true
        $helperInfo.RedirectStandardError = $true
        $helperProcess = New-Object Diagnostics.Process
        $helperProcess.StartInfo = $helperInfo
        if (-not $helperProcess.Start()) { throw 'Startup failed' }
        # Drain output without printing or saving it: exceptions can contain secrets.
        $helperOut = $helperProcess.StandardOutput.BaseStream.CopyToAsync([IO.Stream]::Null)
        $helperErr = $helperProcess.StandardError.BaseStream.CopyToAsync([IO.Stream]::Null)
        Write-Host "$ServiceName started. Press Ctrl+C to stop. Service output is suppressed to protect secrets."
        while (-not $helperProcess.WaitForExit(500)) { }
        $helperOut.GetAwaiter().GetResult()
        $helperErr.GetAwaiter().GetResult()
        if ($helperProcess.ExitCode -ne 0) { throw 'Service failed' }
    } catch {
        throw 'Local service failed. Check required configuration and executable availability privately. No service output or configuration values were printed.'
    } finally {
        if ($null -ne $helperProcess) {
            if (-not $helperProcess.HasExited) { $helperProcess.Kill(); $helperProcess.WaitForExit() }
            $helperProcess.Dispose()
        }
    }
}
