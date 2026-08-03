$ErrorActionPreference = "SilentlyContinue"
$vault = "C:\Users\$env:USERNAME\obsidian-vault"

# Project-key folder shape varies by machine (depends on the Claude Code cwd
# each machine actually uses, e.g. C--Users-mikef vs C--Users-nospa-claude-projects),
# so resolve it dynamically instead of assuming "C--Users-$env:USERNAME" exactly.
# Prefer whichever matching candidate has the most recently modified MEMORY.md
# (the one actually in active use), rather than sub-project keys from working
# inside a specific project folder.
$projectsRoot = "C:\Users\$env:USERNAME\.claude\projects"
$memory = $null
$candidate = Get-ChildItem $projectsRoot -Directory -Filter "C--Users-$env:USERNAME*" -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'memory\MEMORY.md') } |
    Sort-Object { (Get-Item (Join-Path $_.FullName 'memory\MEMORY.md')).LastWriteTime } -Descending |
    Select-Object -First 1
if ($candidate) { $memory = Join-Path $candidate.FullName 'memory' }
if (-not $memory) { exit 1 }

Set-Location $vault
git pull 2>&1 | Out-Null
robocopy $vault $memory *.md /XO /XD .git .obsidian /NFL /NDL /NJH /NJS | Out-Null
robocopy $memory $vault *.md /XO /XD .git .obsidian /NFL /NDL /NJH /NJS | Out-Null
$changes = git status --short
if ($changes) {
    git add -A 2>&1 | Out-Null
    git commit -m "Auto memory sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
    git push 2>&1 | Out-Null
}
