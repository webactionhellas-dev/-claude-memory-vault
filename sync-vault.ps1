$ErrorActionPreference = "SilentlyContinue"
$vault = "C:\Users\$env:USERNAME\obsidian-vault"
$memory = "C:\Users\$env:USERNAME\.claude\projects\C--Users-$env:USERNAME\memory"
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
