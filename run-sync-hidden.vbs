' Truly hides the console window for the scheduled MemoryVaultSync task.
' -WindowStyle Hidden on powershell.exe only hides the window AFTER it opens
' (a brief visible flash still occurs). WshShell.Run with intWindowStyle=0
' passes SW_HIDE at process-CREATION time, so no window is ever shown.
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -File ""C:\Users\mikef\obsidian-vault\sync-vault.ps1""", 0, True
