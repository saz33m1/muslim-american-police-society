# predev helper: make sure the Docker daemon is up, then start the MinIO stack.
# If Docker Desktop is closed we launch it and poll until the daemon answers
# (cold start is ~20-40s). Best-effort: any failure exits 0 so `npm run dev`
# still boots the frontend without S3.

$ErrorActionPreference = 'SilentlyContinue'

function Test-Daemon { docker info *> $null; return ($LASTEXITCODE -eq 0) }

# Docker Desktop 4.78 crash-loops on boot trying to remove a leftover AF_UNIX
# socket it can't access ("Inference manager ... dockerInference: The file cannot
# be accessed by the system" — docker/desktop-feedback#342). The orphaned sockets
# are undeletable, so we move the host socket dirs aside; Docker recreates them
# empty and starts clean. Only runs when the daemon is down (won't disturb a
# healthy Docker). The moved-aside *_old dirs hold undeletable sockets — they're
# tiny and only clear after a reboot frees the handle; harmless to leave.
function Clear-DockerSockets {
  Get-Process 'Docker Desktop', 'com.docker*', 'dockerd' | Stop-Process -Force
  Start-Sleep -Seconds 2
  foreach ($d in @("$env:LOCALAPPDATA\Docker\run", "$env:LOCALAPPDATA\docker-secrets-engine")) {
    if (Test-Path $d) { Move-Item $d "$d`_old$(Get-Random)" }
  }
}

if (-not (Test-Daemon)) {
  Write-Host 'Docker daemon down, clearing stale sockets and starting Docker Desktop...'
  Clear-DockerSockets
  Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  $deadline = (Get-Date).AddSeconds(90)
  while (-not (Test-Daemon)) {
    if ((Get-Date) -gt $deadline) { Write-Host 'Docker did not come up in 90s, skipping MinIO.'; exit 0 }
    Start-Sleep -Seconds 3
  }
  Write-Host 'Docker daemon ready.'
}

docker compose up -d
exit 0
