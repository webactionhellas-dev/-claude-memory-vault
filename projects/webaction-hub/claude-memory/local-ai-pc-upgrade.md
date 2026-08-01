---
name: local-ai-pc-upgrade
description: "Mike's PC specs + the hardware upgrade plan to run local AI agents (GPU + RAM)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 29c3a099-f985-45fa-8754-e70a4a3bdef4
---

Mike wants to run AI agents **locally/offline** (models on his own hardware via Ollama/LM Studio), confirmed June 2026. Hardware consult done; parts chosen but not yet bought.

**His PC (Mini-ITX):**
- Board: Gigabyte **B450 I AORUS PRO WIFI** (Mini-ITX, AM4, **2 DIMM slots**, DDR4, PCIe 3.0), BIOS F51
- CPU: Ryzen 5 3600 (6c/12t) — keeping it (minimal AI gain from upgrading; GPU does inference)
- GPU: Radeon **RX 570 4 GB** (the bottleneck — AMD Polaris, no CUDA/ROCm on Windows) → replacing
- RAM: 16 GB (2×8) DDR4 running slow at **2133 MHz** (DOCP not enabled); idles at ~84% used
- SSD: Samsung 860 EVO 1 TB SATA, 521 GB free — keeping (enough for model files)

**Decided upgrade (links on Skroutz):**
- GPU: **Asus RTX 3060 12 GB Dual V2 OC — €358.66** (~227 mm, fits ITX since RX 570 already fits; ~170 W, runs on existing PSU). 12 GB VRAM runs ~14B agents on-GPU. Required.
- RAM: **Corsair Vengeance LPX 32 GB (2×16) DDR4-3200 — €279** (low-profile for ITX clearance; 32 GB is enough for a 12 GB GPU). Recommended.
- Total ~€638.

**Key facts established:**
- VRAM (12 GB), not system RAM, caps local model size. 32 GB system RAM is plenty; 64 GB is overkill. Rejected the 8+32=40 GB mixed-stick idea (flex-mode single-channel + would drag speed down to old 2133 + no saving).
- **2026 memory/NAND price spike**: DDR4 and SSDs are ~4× normal across the whole Greek market (not just Plaisio) — e.g. 64 GB DDR4 ~€600, Samsung 980 1 TB ~€234. So skip SSD upgrade; buy RAM only because he's memory-constrained.
- Plaisio is overpriced/backordered on legacy AM4/DDR4/30-series; Skroutz aggregates cheaper Greek shops. 5700X3D was out of stock.
- First-boot steps: enable **DOCP** (RAM to 3200) + **fTPM** (for Win11) in BIOS.

Next likely ask: Ollama/LM Studio setup once parts arrive. Relates to [[managed-agents-provisioning]] and [[hermes-agent-setup]] (his agent work).
