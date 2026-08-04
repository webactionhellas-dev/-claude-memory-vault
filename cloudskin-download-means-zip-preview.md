---
name: cloudskin-download-means-zip-preview
description: "For CloudSkin, \"download/save the latest version\" means zip the current working folder, not scrape a live site"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ef77e4c4-73b8-41d1-882f-1dc6c3d1fd02
---

When the user says "download" / "save" / "get the latest version of cloudskin" (or "the site we made now on the server"), they mean: package the current working project at `claude projects/cloudskin` (the exact version running in the local preview) into a dated .zip in `Downloads`. They do NOT mean scrape the live cloudskin.com or pull from a remote server.

**Why:** On 2026-07-06 they asked to "download the latest version of cloudskin"; I offered scrape-live-site / zip-project / extract-newer-zip and started chasing a server URL — they corrected me twice: "no save the project we have now in preview."

**How to apply:** Zip the contents of the project folder (files at the zip root, deployable as-is) to `Downloads/cloudskin-site-YYYY-MM-DD.zip`. Consider offering a slim variant that excludes `img/candidates/` (raw curation photos the live pages don't reference). See [[cloudskin-site]].
