---
name: Workflow restart behavior
description: Replit artifact workflow restarts may leave an orphaned child server process.
---

When an artifact workflow fails during restart with `EADDRINUSE`, check for and
stop the previous child server process before restarting the managed workflow.

**Why:** A failed managed restart can leave the old server process listening
while the workflow wrapper exits, so the next start fails even though the
application itself is healthy.

**How to apply:** Confirm the listener and process first, terminate only the
stale process for that artifact, then restart the exact managed workflow once.