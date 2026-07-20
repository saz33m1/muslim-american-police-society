# register-backup-task.ps1 -- one-shot: register the weekly prod backup as a
# Windows Scheduled Task. Run ONCE in an ADMIN PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1
#
# Ceiling: laptop-based. Only fires when this machine is awake + online with
# Docker Desktop running. It wakes the machine to run and, if a run is missed
# (laptop off), runs as soon as possible after. For a backup that survives a
# dead laptop, the offsite copy in Google Drive (this task's output) is the point.

$ErrorActionPreference = 'Stop'

# Machine-local, not env-configurable: edit these four lines for a fork
# (task name, repo checkout path, and the maintainer's offsite backup folder).
$TaskName = 'MAPS prod backup'
$RepoDir  = 'C:\dev\maps-website'
$OutDir   = 'C:\Users\syedw\My Drive\05_Projects\MAPS\maps-website-backup'
$RunAt    = '2:00AM'
$RunDay   = 'Sunday'   # weekly

# npm is a .cmd shim; invoke through cmd so PATH resolution works under the scheduler.
$cmd = "cd /d `"$RepoDir`" && npm run backup:prod -- --out `"$OutDir`""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c $cmd"

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $RunDay -At $RunAt

# Wake the box to run; if a scheduled run was missed, run at next opportunity.
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew

# Run as the current user so it reaches the user's Docker + Drive session.
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force `
  -Description 'Daily offsite backup of prod DB + media bucket to Google Drive (backup:prod).'

Write-Host "Registered '$TaskName': weekly $RunDay $RunAt -> $OutDir"
Write-Host "Test it now:  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Inspect:      Get-ScheduledTaskInfo -TaskName '$TaskName'"
