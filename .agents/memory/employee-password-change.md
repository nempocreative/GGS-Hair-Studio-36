---
name: Employee password change session policy
description: Security behavior to preserve when employees update their account password.
---

When an employee changes their password, require the current password, keep the current employee session active, revoke other sessions, and lock cashier access in the active session.

**Why:** The employee should not be signed out mid-task, while any other stale or potentially compromised session should lose access. A cashier register should require a fresh unlock after the credential change.

**How to apply:** Preserve this behavior when changing the employee profile, password endpoint, session handling, or cashier authentication.
