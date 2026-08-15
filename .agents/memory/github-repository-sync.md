---
name: GitHub synchronization
description: Authentication constraint for syncing this workspace with the GitHub origin.
---

The repository can be fetched and tracked locally through its public HTTPS `origin`,
but pushing changes to GitHub requires an authenticated GitHub/Replit integration;
the remote rejects unauthenticated HTTPS pushes.

**Why:** GitHub no longer accepts password authentication for Git operations, and
the workspace may have no bound GitHub OAuth connection even when the repository is
publicly readable.

**How to apply:** Keep the local branch tracking `origin/main`. Before promising a
remote push, verify a GitHub integration is authorized and bound; otherwise report
the local commit as complete but remote synchronization as pending.