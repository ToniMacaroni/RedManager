# RedManager Cleanup Script
# This script terminates all processes that might interfere with development

Write-Host "[CLEANUP] Starting development process cleanup..." -ForegroundColor Cyan

# Kill RedModManager processes
$redManagerProcesses = Get-Process -Name "RedModManager" -ErrorAction SilentlyContinue
if ($redManagerProcesses) {
    Write-Host "  [TASK] Terminating RedModManager processes..." -ForegroundColor Yellow
    $redManagerProcesses | Stop-Process -Force
    Write-Host "    [SUCCESS] $($redManagerProcesses.Count) RedModManager process(es) terminated" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No RedModManager processes found" -ForegroundColor Green
}

# Kill Node processes (only those related to this project)
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*RedManager*" -or $_.CommandLine -like "*tauri*dev*" 
}
if ($nodeProcesses) {
    Write-Host "  [TASK] Terminating Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "    [SUCCESS] $($nodeProcesses.Count) Node.js process(es) terminated" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No relevant Node.js processes found" -ForegroundColor Green
}

# Kill Cargo processes
$cargoProcesses = Get-Process -Name "cargo" -ErrorAction SilentlyContinue
if ($cargoProcesses) {
    Write-Host "  [TASK] Terminating Cargo processes..." -ForegroundColor Yellow
    $cargoProcesses | Stop-Process -Force
    Write-Host "    [SUCCESS] $($cargoProcesses.Count) Cargo process(es) terminated" -ForegroundColor Green
} else {
    Write-Host "  [INFO] No Cargo processes found" -ForegroundColor Green
}

# Check for port 1420 usage
$portUsage = netstat -ano | findstr :1420
if ($portUsage) {
    Write-Host "  [WARNING] Port 1420 may still be in use (TIME_WAIT connections)" -ForegroundColor Yellow
    Write-Host "    [INFO] This is normal and will clear automatically" -ForegroundColor Gray
} else {
    Write-Host "  [SUCCESS] Port 1420 is free" -ForegroundColor Green
}

Write-Host "[COMPLETE] Cleanup finished! You can now start the development server." -ForegroundColor Green
Write-Host ""