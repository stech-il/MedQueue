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
    $BaseUrl = (Get-Content $urlFile -Raw -Encoding UTF8).Trim()
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

$lnkFull = Join-Path $desktop 'MedQueue Kiosk.lnk'
New-Shortcut -Path $lnkFull `
  -Target $launcherBat `
  -Arguments '' `
  -WorkingDir $PSScriptRoot `
  -Description "MedQueue Kiosk + print agent - $kioskUrl"

$chrome = Join-Path ${env:ProgramFiles} 'Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) {
  $chrome = Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'
}

$chromeOk = Test-Path $chrome
if ($chromeOk) {
  $profile = Join-Path $env:LOCALAPPDATA 'MedQueueKioskChrome'
  $chromeArgs = (
    '--kiosk',
    '--disable-print-preview',
    '--no-first-run',
    '--unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:39123',
    ('--user-data-dir=' + [char]34 + $profile + [char]34),
    ($kioskUrl)
  ) -join ' '

  $lnkChrome = Join-Path $desktop 'MedQueue Kiosk Chrome.lnk'
  New-Shortcut -Path $lnkChrome `
    -Target $chrome `
    -Arguments $chromeArgs `
    -WorkingDir $ProjectRoot `
    -Description "MedQueue Kiosk Chrome - $kioskUrl"
}

Write-Host ''
Write-Host 'Desktop shortcuts created:'
Write-Host '  MedQueue Kiosk.lnk         (print agent + Chrome, recommended)'
if ($chromeOk) {
  Write-Host '  MedQueue Kiosk Chrome.lnk  (Chrome only)'
}
Write-Host ''
Write-Host "URL: $kioskUrl"
