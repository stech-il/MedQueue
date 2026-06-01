param(
  [string]$BaseUrl = '',
  [string]$ProjectRoot = ''
)

$ErrorActionPreference = 'Stop'

if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

if (-not $BaseUrl) {
  $urlFile = Join-Path $PSScriptRoot 'medqueue-kiosk.url.txt'
  if (Test-Path $urlFile) {
    $BaseUrl = (Get-Content $urlFile -Raw).Trim()
  } else {
    $BaseUrl = 'https://medqueue-6ivj.onrender.com'
  }
}

$BaseUrl = $BaseUrl.Trim().TrimEnd('/')
if ($BaseUrl -match '/kiosk/?$') {
  $BaseUrl = $BaseUrl -replace '/kiosk/?$', ''
}

$kioskUrl = "$BaseUrl/kiosk?kiosk=1"
$launcherBat = Join-Path $PSScriptRoot 'start-kiosk-medqueue.bat'
$desktop = [Environment]::GetFolderPath('Desktop')

function New-Shortcut {
  param(
    [string]$Path,
    [string]$Target,
    [string]$Arguments,
    [string]$WorkingDir,
    [string]$Description
  )
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($Path)
  $sc.TargetPath = $Target
  $sc.Arguments = $Arguments
  $sc.WorkingDirectory = $WorkingDir
  $sc.Description = $Description
  $sc.Save()
}

# קיצור 1: הפעלה מלאה (סוכן + Chrome) — ללא ארגומנטים, עובד גם בתיקייה עם רווחים
$lnkFull = Join-Path $desktop 'MedQueue קיוסק.lnk'
New-Shortcut -Path $lnkFull `
  -Target $launcherBat `
  -Arguments '' `
  -WorkingDir $PSScriptRoot `
  -Description "MedQueue קיוסק + הדפסה — $kioskUrl"

# קיצור 2: Chrome ישירות לכתובת הקיוסק (גיבוי)
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}
if (Test-Path $chrome) {
  $profile = Join-Path $env:LOCALAPPDATA 'MedQueueKioskChrome'
  $chromeArgs = @(
    '--kiosk',
    '--kiosk-printing',
    '--disable-print-preview',
    '--no-first-run',
    "--user-data-dir=`"$profile`"",
    "`"$kioskUrl`""
  ) -join ' '

  $lnkChrome = Join-Path $desktop 'MedQueue קיוסק (Chrome).lnk'
  New-Shortcut -Path $lnkChrome `
    -Target $chrome `
    -Arguments $chromeArgs `
    -WorkingDir $ProjectRoot `
    -Description "MedQueue קיוסק — $kioskUrl"
}

Write-Host ""
Write-Host "נוצרו קיצורים על שולחן העבודה:"
Write-Host "  MedQueue קיוסק.lnk          — סוכן הדפסה + Chrome (מומלץ)"
if (Test-Path $chrome) {
  Write-Host "  MedQueue קיוסק (Chrome).lnk — רק דפדפן"
}
Write-Host ""
Write-Host "כתובת: $kioskUrl"
