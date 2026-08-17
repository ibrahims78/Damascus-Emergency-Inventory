---
name: Demo movement fixtures
description: Durable rules for seeded inventory movement data and its verification.
---

Use a stable marker and scenario-specific lookup for persistent demo movements so
rerunning the seed resumes the fixture instead of duplicating stock changes.
Verify exact movement counts, batch allocations, final balances, and custody states;
presence-only checks can miss arithmetic drift.

**Why:** The fixture is intentionally visible in the application and may be seeded
again after a restart or workspace refresh. Duplicate positive movements would
silently corrupt the demonstration balances.

**How to apply:** Keep every scenario deterministic and uniquely named, make the
seed safe to rerun, and assert the expected ledger result after all scenarios.