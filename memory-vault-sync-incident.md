---
name: memory-vault-sync-incident
description: "The MemoryVaultSync scheduled task silently failed for ~13 hours (2026-08-01) because sync-vault.ps1 had an unresolved git merge conflict committed into it; how it was caught and fixed, and how to check task health if it happens again"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-01T18:11:01.889Z
  originSessionId: 70f1bde9-a5a3-4cb5-ac72-971762bb76e7
---

`C:\Users\mikef\obsidian-vault\sync-vault.ps1` (the script the "MemoryVaultSync" Windows Scheduled Task runs every 5 minutes — see the CLAUDE.md standing rule for the sync process itself) had literal unresolved git conflict markers (`<<<<<<< HEAD` / `=======` / `>>>>>>>`) committed into it, left over from Asteris's machine and Mike's machine each committing a different version (Mike's hardcoded `C:\Users\mikef\...`; Asteris's used portable `$env:USERNAME`). Invalid PowerShell syntax = every scheduled run threw immediately and did nothing, with no alert to anyone. There's a ~13-hour gap in the vault's commit history that day (06:12 to 19:43) that lines up exactly with this.

**Why: no one noticed** because the failure is silent — the scheduled task just doesn't produce output, and the only symptom is "the vault looks a bit stale," which is easy to write off as "nobody made changes."

**Fixed 2026-08-01:** resolved the conflict in favor of the portable `$env:USERNAME` version (correct for a script that runs on multiple machines under possibly-different Windows usernames), validated with `[System.Management.Automation.Language.Parser]::ParseFile`, ran it once manually to confirm a clean exit, committed, pushed.

**How to check task health if the vault ever seems stale again:**
```powershell
Get-ScheduledTaskInfo -TaskName "MemoryVaultSync"   # LastTaskResult should be 0
```
A non-zero `LastTaskResult` (or a long gap in `git log` in `obsidian-vault` with no matching absence of real work) is the signal to open `sync-vault.ps1` and check for exactly this class of problem — a botched merge from the two machines editing the same script independently. There is currently no active alerting for this; it was only caught because Mike asked "is this working right now" and it was checked by hand.

See [[mike-operator-profile]] for the Asteris/shared-vault context.
