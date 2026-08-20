---
name: GitHub synchronization
description: Authentication constraint for syncing this workspace with the GitHub origin.
---

The repository can be fetched and tracked locally through its public HTTPS `origin`.
Pushing changes requires either an authenticated GitHub/Replit integration or a
securely stored `GITHUB_TOKEN`; the remote rejects unauthenticated HTTPS pushes.

**Why:** GitHub no longer accepts password authentication for Git operations, and
the workspace may have no bound GitHub OAuth connection even when the repository is
publicly readable.

**How to apply:** Keep the local branch tracking `origin/main`. Before promising a
remote push, verify OAuth is bound or that the secure `GITHUB_TOKEN` exists. This
workspace uses a Git credential helper that reads the token from the environment
without embedding it in the remote URL. Never place the token in repository files
or chat messages.