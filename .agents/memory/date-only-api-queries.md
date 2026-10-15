---
name: Date-only API queries
description: Handling OpenAPI date query parameters in Express routes with generated Zod schemas.
---

Normalize date-only query parameters from Express strings to validated `Date` objects before passing them to generated Zod schemas. Require the exact `YYYY-MM-DD` form and verify a round trip so invalid dates such as February 31 are rejected. Serialize date-only response fields back to `YYYY-MM-DD`.

**Why:** OpenAPI codegen can produce `z.date()` for query parameters even though Express supplies URL query values as strings; passing the raw values makes valid requests fail validation, while response parsing can serialize date-only values as timestamps.

**How to apply:** Use this at the API boundary for new date-filtered endpoints, keeping date comparisons in the intended business timezone rather than the server or browser timezone.
