$ErrorActionPreference = "SilentlyContinue"
$vault = "C:\Users\$env:USERNAME\obsidian-vault"
$log   = Join-Path $vault ".sync-log.txt"
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Add-Content $log -Encoding UTF8 }

# --- resolve the live memory folder ------------------------------------------
# Current Claude Code keeps memory at ~/.claude/memory. Older machines kept it
# under ~/.claude/projects/<project-key>/memory, and the key shape varies by the
# cwd each machine actually uses (C--Users-mikef vs C--Users-nospa-claude-projects),
# so fall back to scanning and take the most recently modified MEMORY.md.
$memory = $null
$primary = "C:\Users\$env:USERNAME\.claude\memory"
if (Test-Path (Join-Path $primary 'MEMORY.md')) {
    $memory = $primary
} else {
    $projectsRoot = "C:\Users\$env:USERNAME\.claude\projects"
    $candidate = Get-ChildItem $projectsRoot -Directory -Filter "C--Users-$env:USERNAME*" -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'memory\MEMORY.md') } |
        Sort-Object { (Get-Item (Join-Path $_.FullName 'memory\MEMORY.md')).LastWriteTime } -Descending |
        Select-Object -First 1
    if ($candidate) { $memory = Join-Path $candidate.FullName 'memory' }
}
if (-not $memory) { Log "FAIL: no memory folder found"; exit 1 }

# --- MEMORY.md is an index, so union it instead of letting newest-wins --------
# A blind copy drops every line the other side added. Key on the link target,
# keep first-seen order, and prefer the more detailed description on a clash.
function Merge-Index($fileA, $fileB, $outPaths) {
    $order = New-Object System.Collections.Generic.List[string]
    $map = @{}
    foreach ($f in @($fileA, $fileB)) {
        if (-not (Test-Path $f)) { continue }
        foreach ($line in (Get-Content $f -Encoding UTF8)) {
            $m = [regex]::Match($line, '^-\s*\[[^\]]*\]\(([^)]+)\)')
            if (-not $m.Success) { continue }
            $k = $m.Groups[1].Value.ToLower()
            if (-not $map.ContainsKey($k)) { $order.Add($k); $map[$k] = $line.TrimEnd() }
            elseif ($line.TrimEnd().Length -gt $map[$k].Length) { $map[$k] = $line.TrimEnd() }
        }
    }
    $text = (($order | ForEach-Object { $map[$_] }) -join "`n") + "`n"
    # BOM-free on purpose: a UTF-8 BOM breaks anything that JSON/text-parses these.
    $enc = New-Object System.Text.UTF8Encoding($false)
    foreach ($o in $outPaths) { [System.IO.File]::WriteAllText($o, $text, $enc) }
    return $order.Count
}

Set-Location $vault

# Explicit strategy: a bare `git pull` aborts on divergent branches and, with
# output swallowed, that failure is invisible. That is how this vault silently
# fell 76 commits behind.
git pull --no-rebase --no-edit 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Log "WARN: git pull exit $LASTEXITCODE (conflict or auth) - continuing with local state" }

# Notes: newest-wins both directions. MEMORY.md excluded, merged separately.
robocopy $vault $memory *.md /XO /XF MEMORY.md /XD .git .obsidian projects /NFL /NDL /NJH /NJS | Out-Null
robocopy $memory $vault *.md /XO /XF MEMORY.md /XD .git .obsidian projects /NFL /NDL /NJH /NJS | Out-Null

$lines = Merge-Index (Join-Path $memory 'MEMORY.md') (Join-Path $vault 'MEMORY.md') @(
    (Join-Path $memory 'MEMORY.md'), (Join-Path $vault 'MEMORY.md'))

$changes = git status --short
if ($changes) {
    git add -A 2>&1 | Out-Null
    git commit -m "Auto memory sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
    git push 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log "FAIL: git push exit $LASTEXITCODE" } else { Log "OK: synced, index $lines lines" }
} else {
    Log "OK: no changes, index $lines lines"
}
