param(
  [Parameter(Mandatory)][string]$FilePath,
  [string]$PrinterName = ''
)

$lines = Get-Content -LiteralPath $FilePath -Encoding UTF8
if ($PrinterName) {
  $lines | Out-Printer -Name $PrinterName
} else {
  $lines | Out-Printer
}
