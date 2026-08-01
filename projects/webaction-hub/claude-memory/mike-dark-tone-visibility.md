---
name: mike-dark-tone-visibility
description: Mike struggles to see dark/black tones on his LG monitor; lift the GPU gamma shadows to help
metadata: 
  node_type: memory
  type: user
  originSessionId: ab839f17-b021-4c9a-9b3e-5e0783c9612e
---

Mike has trouble distinguishing dark and black tones on his display — dark UI/website elements collapse into black and become invisible to him. His monitor is a single **LG (GSM5B72), 1920x1080** on a **Radeon RX 570**. His Windows/GPU gamma was confirmed **default/linear**, so the crushed blacks come from the monitor's own brightness/black level, not a software mis-setting.

**How to help:** apply a software shadow-lift to the GPU gamma ramp (fully reversible, resets on reboot/driver reload). Done from PowerShell via P/Invoke `SetDeviceGammaRamp` on `GetDC(NULL)`, building a 768-entry `uint16[]` ramp (R,G,B each 256). The curve that worked as a starting point: `out = floor + (1-floor) * (i/255)^(1/gamma)`, with **gamma 1.5, floor 0.03** — lifts near-blacks ~3-4x, leaves white untouched, applied with no Windows clamping. Back up the current ramp first (`GetDeviceGammaRamp`). To revert, restore linear (`ramp[i]=i*256`) since his default was linear. Dial gamma/floor up for a stronger lift, down if it looks milky/washed out.

Note: I cannot self-verify the result — a framebuffer screenshot captures pixels *before* the GPU LUT, so Mike's eyes are the only test. Ask him to confirm and tune. If he likes it, offer to make it persist at startup (scheduled task re-applying the ramp).

The in-app computer-use screenshot masks non-granted apps as a solid dark rectangle; to see his true screen use a PowerShell `CopyFromScreen` capture and Read the PNG.
