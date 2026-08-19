---
name: Backup restore user references
description: Cross-environment backups must account for different local user IDs because users are intentionally not restored.
---

When restoring a backup between environments, preserve the current environment's users and remap missing `created_by` or `user_id` references to the authenticated administrator before inserting dependent records.

**Why:** Backup packages omit password hashes and therefore do not restore users; production user IDs can differ from the source environment, causing full restores to fail on foreign-key references such as audit logs.

**How to apply:** Resolve existing production user IDs inside the restore transaction, pass the current admin as a fallback, and keep the remapping visible in the restore result or audit trail.