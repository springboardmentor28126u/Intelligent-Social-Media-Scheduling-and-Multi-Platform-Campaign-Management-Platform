param([switch]$PostgresTest)
$ErrorActionPreference = 'Stop'
# Never load project environment files. All values below are disposable test settings.
$env:PYTHON_DOTENV_DISABLED = '1'
$env:DATABASE_URL = 'sqlite://'
$env:JWT_SECRET_KEY = 'isolated-test-key-not-for-production-use'
$env:APP_ENV = 'test'
$testKey = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($testKey)
$env:SOCIAL_TOKEN_KEY = [Convert]::ToBase64String($testKey).Replace('+','-').Replace('/','_')
$env:SOCIALPILOT_TEST_POSTGRES = '0'
if ($PostgresTest) {
    $env:DATABASE_URL = 'postgresql+psycopg://socialpilot_test@127.0.0.1:55439/postgres?connect_timeout=5'
    $env:SOCIALPILOT_TEST_POSTGRES = '1'
}
Push-Location "$PSScriptRoot/../Backend"
try {
    & ./venv/Scripts/python.exe -m unittest discover -s tests -q
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed' }
    & ./venv/Scripts/python.exe -m alembic heads
    if ($LASTEXITCODE -ne 0) { throw 'Alembic check failed' }
} finally { Pop-Location }
Push-Location "$PSScriptRoot/../frontend"
try {
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'Frontend lint failed' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    node --test tests/*.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed' }
} finally { Pop-Location }
