# Nightly: commit and push the encrypted sync file the local app wrote via
# tools/serve.py. Only that one file is ever committed; anything else in the
# working tree is left alone. Run by the "NotesNightlySync" scheduled task.
$ErrorActionPreference = 'Continue'
$repo = Split-Path $PSScriptRoot -Parent
$log = Join-Path $PSScriptRoot 'sync.log'
$file = 'sync/backup.enc.json'
Set-Location $repo

function Write-Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $log }

if (-not (Test-Path $file)) { Write-Log 'no sync file yet (open the local app via tools/serve.py)'; exit 0 }

git add -- $file
git diff --cached --quiet -- $file
if ($LASTEXITCODE -eq 0) { Write-Log 'no changes'; exit 0 }

git commit -q -m "chore: nightly sync $(Get-Date -Format 'yyyy-MM-dd')" -- $file
if ($LASTEXITCODE -ne 0) { Write-Log 'commit failed'; exit 1 }
git push -q origin main
if ($LASTEXITCODE -ne 0) { Write-Log 'push failed (committed locally, will go out with the next push)'; exit 1 }
Write-Log 'pushed'
