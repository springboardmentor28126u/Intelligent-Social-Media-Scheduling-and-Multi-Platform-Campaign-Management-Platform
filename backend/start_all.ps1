Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -l "C:\Program Files\PostgreSQL\18\data\log.txt"
Start-Sleep -Seconds 3

$backendPath = "C:\Users\hp\socialpilot\backend"
$venvActivate = "C:\Users\hp\socialpilot\venv\Scripts\Activate.ps1"

Write-Host "Starting FastAPI (uvicorn)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '$venvActivate'; uvicorn main:app --reload"

Start-Sleep -Seconds 2

Write-Host "Starting Celery worker..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '$venvActivate'; celery -A celery_app worker --loglevel=info --pool=solo"

Start-Sleep -Seconds 2

Write-Host "Starting Celery beat..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '$venvActivate'; celery -A celery_app beat --loglevel=info"

Write-Host "All processes launching in separate windows. Check each for a clean startup." -ForegroundColor Green
