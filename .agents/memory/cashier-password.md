---
name: Cashier password stability
description: Keep cashier register passwords unchanged when employees switch accounts.
---

Do not change or rotate a configured cashier password when the signed-in employee account changes. Cashier unlock should validate the configured password and update only the session.

**Why:** the user asked that the cashier password stay unchanged when switching accounts.

**How to apply:** Keep password configuration independent from employee login/logout. Switching between register units may validate that unit's own configured password, but must not mutate either password.
