---
name: powershell-utf8-bom-json-trap
description: PowerShell Out-File -Encoding utf8 writes a BOM that silently breaks JSON configs; Obsidian reset its config and dropped an enabled plugin because of it
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 93cce21d-35f7-4bdf-8adb-d21fd7ad80c4
  modified: 2026-08-02T22:19:11.756Z
---

Windows PowerShell 5.1 `Out-File -Encoding utf8` (and `Set-Content -Encoding utf8`) writes
a **UTF-8 BOM**. Many JSON consumers reject the BOM, and the well-behaved ones fail
*silently* by falling back to defaults and rewriting the file.

Hit on 2026-08-03 writing `.obsidian\appearance.json` and `community-plugins.json`:
Obsidian could not parse either file, reset both to `{}` and `[]`, and in doing so
**disabled `obsidian-git`**, which had been enabled before. The damage was invisible until
a runtime check showed the theme and plugin had not loaded.

**Why:** the failure mode is silent and destructive. Nothing errors; the config just
reverts, and unrelated user settings can be lost along with the intended change.

**How to apply:** write JSON and other machine-read config with the Write tool or
`node -e "fs.writeFileSync(...)"`, never PowerShell redirection. Verify with
`head -c 3 file | xxd` (expect the first byte to be `{` / `[`, not `ef bb bf`) and a
`JSON.parse` round trip. Before overwriting an app's config, read it first and preserve
the entries already there, so a bad write cannot quietly drop the user's own settings.
Related: [[obsidian-asteris-theme]].
