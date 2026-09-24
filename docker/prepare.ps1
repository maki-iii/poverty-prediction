$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) {
    throw 'Node.js is needed to export your existing database. Open a terminal where node --version works.'
}
Write-Host 'Pause uploads/training and other data changes while this snapshot is prepared.'
& $nodePath (Join-Path $PSScriptRoot 'prepare.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Snapshot preparation did not finish. No original data was removed.' }
