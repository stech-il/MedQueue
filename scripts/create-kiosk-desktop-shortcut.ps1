param(
  [string]$BaseUrl = 'https://medqueue-6ivj.onrender.com',
  [string]$ProjectRoot = ''
)
if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

$bat = Join-Path $PSScriptRoot 'start-kiosk-render.bat'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'MedQueue קיוסק.lnk'

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnk)
$sc.TargetPath = $bat
$sc.Arguments = $BaseUrl.TrimEnd('/')
$sc.WorkingDirectory = $ProjectRoot
$sc.Description = 'MedQueue קיוסק + הדפסה אוטומטית'
$sc.Save()

Write-Host "נוצר: $lnk"
