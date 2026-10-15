---
name: Cashier announcement dates
description: Calendar-date behavior for GGS cashier announcements.
---

Treat announcement start and end values as calendar dates in Asia/Jakarta, not timestamps in the device timezone. An announcement remains visible through the entirety of its end date.

**Why:** The database stores these values as PostgreSQL `date`, and filtering them as timestamps can make an announcement disappear early or show a different date on devices in other timezones.

**How to apply:** Keep date-only inputs, display formatting, and server-side active-window checks aligned to the Jakarta calendar; use an inclusive end-date comparison.
