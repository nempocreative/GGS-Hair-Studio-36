---
name: Transparent cutouts
description: Check transparency before removing or recoloring backgrounds on supplied image assets.
---

**Rule:** Inspect the alpha channel before attempting background removal on a supplied PNG, especially when dark artwork is shown against black.

**Why:** Transparent pixels can display as black in previews; removing the apparent background can instead damage dark edges or the subject.

**How to apply:** If the image has alpha, preserve and use it directly for compositing. Only remove a background when the pixels are actually opaque.
