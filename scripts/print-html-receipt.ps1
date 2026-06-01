param(
  [Parameter(Mandatory)][string]$HtmlPath,
  [string]$PrinterName = ''
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$resolved = (Resolve-Path -LiteralPath $HtmlPath).Path
$fileUri = 'file:///' + ($resolved -replace '\\', '/')

$form = New-Object System.Windows.Forms.Form
$form.ShowInTaskbar = $false
$form.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$form.Size = New-Object System.Drawing.Size(1, 1)
$form.Opacity = 0

$browser = New-Object System.Windows.Forms.WebBrowser
$browser.ScriptErrorsSuppressed = $true
$browser.ScrollBarsEnabled = $false
$browser.Dock = [System.Windows.Forms.DockStyle]::Fill
[void]$form.Controls.Add($browser)

$printed = $false
$browser.Add_DocumentCompleted({
  param($sender, $e)
  if ($script:printed) { return }
  if ($sender.ReadyState -ne [System.Windows.Forms.ReadyState]::Complete) { return }
  $script:printed = $true
  Start-Sleep -Milliseconds 350
  $sender.Print()
  $form.Close()
})

$form.Add_Shown({ $form.Hide() })
$browser.Navigate($fileUri)

$sw = [Diagnostics.Stopwatch]::StartNew()
while (-not $printed -and $sw.ElapsedMilliseconds -lt 20000) {
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 80
}

if (-not $printed) {
  throw 'HTML print timeout'
}
