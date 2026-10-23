---
name: aico-git
description: "Agent-driven multi-repo Git operations for AICO Spec-Driven Development: inspect status, pull, push, commit, and clone across decoupled specs and codebase repositories."
disable-model-invocation: false
---

# AICO Git: Agent-Driven Multi-Repository Git Workflow

`aico-git` provides automated Git operations (`git-status`, `git-pull`, `git-push`, `git-commit`, `git-clone`) across decoupled AICO project repositories, ensuring strict adherence to workspace directory topology conventions and manifest definitions.

---

## 1. Multi-Repository Topology & Canonical Clone Rules

In accordance with [ADR-0002](../../adr/0002-decoupled-sdd-and-codebase-repositories.md) and [ADR-0008](../../adr/0008-unified-root-discovery-and-project-manifest.md):
- **Specs Repositories (`type: "specs"`)**:
  - Reside at the top level of the workspace root: `<workspace-root>/<repo-id>` (e.g. `d:/aico/aico-specs` or `<project-name>-specs`).
  - Contains `.aico-project.json` which elevates the specs repository metadata (`project_name`, `id`, `name`, `url`, `created_at`) to top level.
- **Codebase and Skills Repositories (`type: "codebase" | "skills"`)**:
  - Reside strictly inside the `codebase` subfolder: `<workspace-root>/codebase/<repo-id>` (e.g. `d:/aico/codebase/aico`, `d:/aico/codebase/aico-skills`).
  - When cloning:
    - `type === 'specs'` MUST clone into `<workspace-root>/<repo-id>`.
    - `type === 'codebase'` or `type === 'skills'` MUST clone into `<workspace-root>/codebase/<repoId>`.

---

## 2. CLI Subcommands (`aico-cli.mjs`)

The `/aico-git` operations are exposed deterministically via `node <skills-root>/scripts/aico-cli.mjs`:

### 2.1 Git Status (`git-status`)
Inspect branch, upstream tracking, ahead/behind counts, and staged/unstaged/untracked modifications:
```bash
node aico-cli.mjs git-status --repo-dir <path> [--json]
node aico-cli.mjs git-status --workspace <workspaceRoot> --repo <repoId> [--json]
```

### 2.2 Git Pull (`git-pull`)
Fast-forward or pull latest changes from remote:
```bash
node aico-cli.mjs git-pull --repo-dir <path> [--remote origin] [--branch <branch>] [--json]
node aico-cli.mjs git-pull --workspace <workspaceRoot> --repo <repoId> [--json]
```

### 2.3 Git Push (`git-push`)
Push local commits to remote tracking branch:
```bash
node aico-cli.mjs git-push --repo-dir <path> [--remote origin] [--branch <branch>] [--set-upstream] [--json]
node aico-cli.mjs git-push --workspace <workspaceRoot> --repo <repoId> [--json]
```

### 2.4 Git Commit (`git-commit`)
Stage changes and create an atomic commit with mandatory commit message:
```bash
node aico-cli.mjs git-commit --repo-dir <path> -m "<message>" [--all] [--json]
node aico-cli.mjs git-commit --workspace <workspaceRoot> --repo <repoId> -m "<message>" [--json]
```

### 2.5 Git Clone (`git-clone`)
Clone a repository into its canonical path convention:
```bash
node aico-cli.mjs git-clone --workspace <workspaceRoot> --repo <repoId> --url <gitUrl> --type <specs|codebase|skills> [--dry-run] [--json]
```
- For `type: "specs"`: clones into `<workspaceRoot>/<repoId>`.
- For `type: "codebase"` or `type: "skills"`: clones into `<workspaceRoot>/codebase/<repoId>`.

---

## 3. WebUI Integration & Autonomous Agent Workflow

These operations are integrated directly into the Home Dashboard `GitRepositoriesCard.tsx` and autonomous skill execution loops:
- **Unified Repositories Grid (REQ-002)**: All project repositories render in a single cohesive 3-column responsive grid with the Specs repository (`type: 'specs'`) rendered first, eliminating empty column gaps.
- **State-Aware Action Buttons (REQ-003)**:
  - **Pull**: Disabled when `behind === 0` (tooltip `"Up to date (0 commits behind)"`); enabled with `Pull (${repo.behind})` badge when `behind > 0`.
  - **Push**: Disabled when `ahead === 0` (tooltip `"Nothing to push (0 commits ahead)"`); enabled with `Push (${repo.ahead})` badge when `ahead > 0`.
  - **Commit**: Disabled when `repo.is_clean` is true (tooltip `"Working tree clean (nothing to commit)"`); enabled with `Commit (${count})` badge when modified files exist.
- **One-Click AI Commit (REQ-004)**: Clicking the enabled Commit button auto-generates a conventional commit message from git status/diff and executes the commit with progress indicator, without manual text input.
- **Autonomous Agent Workflow Synchronization (REQ-005)**: Coding agents executing `aico-implementation` or `aico-review-loop` automatically stage, commit, and push across decoupled repositories upon verifying red tests turn green and artifacts conform, ensuring developers do not need to manually click git buttons.
