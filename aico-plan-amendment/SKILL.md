---
name: aico-plan-amendment
description: "Amend, append, or mutate tasks within existing plans and epics using the 6-state task lifecycle, ensuring non-destructive historical tracking, dependency consistency, and DAG frontier recalculation."
disable-model-invocation: false
---

# AICO Plan Amendment: Task Graph Evolution & Remediation

Manage, append, and mutate tasks within existing implementation plans (`PLAN-*.md`) and parent epics (`epics/<epic>/`). Use `/aico-plan-amendment` whenever runtime defects, broken seams, missing dependencies, scope changes, or post-implementation regressions require altering an existing plan's DAG.

---

## 1. Core SDD Invariants for Plan Mutation

1. **Non-Destructive Integrity (No Overwrites)**:
   - Never delete or silently overwrite existing tasks in a plan. Historical intent, initial scoping, and audit trails must remain intact.
2. **Strict 6-State Task Lifecycle (ADR-0009)**:
   - `Pending`: Unblocked and queued for work.
   - `In Progress`: Actively being worked on or scaffolded.
   - `Done`: Implementation complete and verified green against designated seams.
   - `Blocked`: Waiting on prerequisite dependency tasks.
   - `Skipped/Canceled`: Explicitly discarded. Requires mandatory:
     - `- **Reason**: <clear justification>`
   - `Rewritten`: Replaced by a revised task. Requires mandatory:
     - `- **Reason**: <justification for rewrite>`
     - `- **Rewrite Target**: <TASK-ID of replacement>`
3. **Plan & Epic Lifecycle Reopening**:
   - If a plan was marked `Completed` (or `Pending`) and new remediation tasks are added, transition the plan's line-1 YAML frontmatter `status` to `In Progress`.
   - If the parent Epic was marked `Completed`, transition its frontmatter `status` to `In Progress` until all amended tasks pass verification.
4. **Universal Blueprint Compliance**:
   - Preserve line-1 YAML frontmatter (`id`, `type: plan`, `aico_skills_version`, `title`, `status`, `derives_from`, `created_at`), ensuring `aico_skills_version` reflects `aico-skills/plugin.json`.
   - All links must remain strict relative paths (`../../adr/...`), never absolute `file:///` URLs.

---

## 2. Amendment Process

```
Runtime Defect / Scope Change ───► /aico-plan-amendment
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      Append Remediation              Rewrite Task                 Cancel Task
    (New sequential TASK-ID)     (Mark Rewritten + Target)     (Mark Skipped + Reason)
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            ▼
                             Recompute Blocking Edges & DAG
                                            │
                                            ▼
                             Reopen Plan Status: In Progress
                                            │
                                            ▼
                             Commit to PLAN-*.md & Kùzu Graph
```

### Step 1: Diagnose & Identify Affected Seam
- Determine whether the issue is:
  - A missed implementation detail of an existing requirement (`REQ-###`).
  - A regression needing a new regression test seam.
  - A technical design flaw requiring an updated approach.

### Step 2: Select Mutation Strategy

#### Strategy A: Append Remediation Tasks via `aico-cli.mjs plan-amend` (Most Common)
When an existing task missed a requirement, integration broke, or a bug was uncovered, run `plan-amend` to auto-assign the next sequential `TASK-ID`, append the task block, record the entry in the single `## 3. Amendment Log`, and reopen the plan/spec/epic status to `"In Progress"`:
```bash
node <skills-path>/scripts/aico-cli.mjs plan-amend \
  --plan <path-to-plan.md> \
  --title "Tailwind CSS Integration & Layout Theme Restoration" \
  --addresses "REQ-001,REQ-015" \
  --seam "frontend/tests/ShellLayout.test.tsx" \
  --delivers "Installs @tailwindcss/vite;Replaces template Vite styles;Rebuilds frontend bundle" \
  --rationale "Restore utility styling across shell layout"
```

#### Strategy B: Rewrite an Outdated Task via `aico-cli.mjs`
When an uncompleted task needs significant reformulation due to requirement changes:
1. Append the replacement task via `aico-cli.mjs plan-amend` (e.g. producing `TASK-CORE-006-7`).
2. Mark the original task `Rewritten` via `aico-cli.mjs task-status`:
   ```bash
   node <skills-path>/scripts/aico-cli.mjs task-status \
     --plan <path-to-plan.md> \
     --task TASK-CORE-006-2 \
     --status Rewritten \
     --reason "Switched from custom grid layout to Radix DockablePanel primitives." \
     --rewrite-target TASK-CORE-006-7
   ```

#### Strategy C: Cancel a Superseded Task via `aico-cli.mjs`
When a pending task is no longer necessary:
```bash
node <skills-path>/scripts/aico-cli.mjs task-status \
  --plan <path-to-plan.md> \
  --task TASK-CORE-006-4 \
  --status "Skipped/Canceled" \
  --reason "Browser window frames provide sufficient OS controls per ADR-0005."
```

### Step 3: Recompute DAG Blocking Edges & Dynamic Frontier
- Verify the DAG and inspect unblocked `Pending` tasks via:
  ```bash
  node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md>
  ```
- Do NOT write a static `## 3. Active Frontier` section to the plan.

### Step 4: Automatic Plan & Epic Status Reopening
- `aico-cli.mjs plan-amend` automatically transitions the plan, sibling spec, and parent epic brainstorm YAML frontmatter `status` to `"In Progress"`, and appends a timestamped entry to the single consolidated `## 3. Amendment Log` section without creating duplicate headers.

### Step 5: Sync with Kùzu Property Graph
Update the task graph in Kùzu:
```cypher
MATCH (p:Plan {id: $plan_id})
SET p.status = "in_progress"

// For new tasks:
MERGE (t:Task {id: $new_task_id, title: $title, status: "pending"})
MERGE (r:Requirement {id: $req_id})
MERGE (t)-[:ADDRESSES]->(r)
MERGE (p)-[:CONTAINS_TASK]->(t)

// For rewritten/canceled tasks:
MATCH (old:Task {id: $old_task_id})
SET old.status = $mutation_status, old.mutation_reason = $reason
```

---

## 3. Completion Criteria

- [ ] Universal line-1 YAML frontmatter maintained on the plan with `status: In Progress`.
- [ ] No previous tasks deleted or overwritten; historical records intact.
- [ ] Any canceled or rewritten tasks include mandatory `Reason` and `Rewrite Target`.
- [ ] Newly added tasks declare `Status`, `Addresses`, `Blocked by`, `What it delivers`, and `Verification Seam`.
- [ ] DAG dependency graph verified with no circular dependencies.
- [ ] No static `## Active Frontier` section created or retained.
- [ ] Single consolidated Plan Amendment Log recorded with timestamp and rationale (no duplicate headers).
