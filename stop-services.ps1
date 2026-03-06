# Stop tire regulation forum services

Write-Host "Stopping frontend service..."
Get-Process node | Where-Object {$_.MainWindowTitle -like "*Frontend*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Stopping backend service..."
Get-Process node | Where-Object {$_.MainWindowTitle -like "*Backend*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Services stopped successfully!" -ForegroundColor Green

Write-Host "Press any key to continue..." -ForegroundColor Yellow
$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
