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
   - Preserve line-1 YAML frontmatter (`id`, `type: plan`, `aico_skills_version: "0.1.2"`, `title`, `status`, `derives_from`, `created_at`).
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

#### Strategy A: Append Remediation Tasks (Most Common)
When an existing task missed a requirement, integration broke, or a bug was uncovered:
1. Assign the next sequential task ID for the plan (e.g. `TASK-CORE-006-6` if tasks 1–5 exist).
2. Clearly formulate the task:
   ```markdown
   - **TASK-CORE-006-6**: Tailwind CSS Integration & Layout Theme Restoration
     - **Status**: Pending
     - **Addresses**: `REQ-001`, `REQ-015`
     - **Blocked by**: None (Can start immediately)
     - **What it delivers**:
       - Installs `@tailwindcss/vite` and `tailwindcss`.
       - Replaces template Vite styles with Tailwind directives.
       - Rebuilds frontend bundle and verifies utility classes render.
     - **Verification Seam**: `frontend/tests/ShellLayout.test.tsx`
   ```

#### Strategy B: Rewrite an Outdated Task
When an uncompleted task needs significant reformulation due to requirement changes:
1. Update the original task:
   ```markdown
   - **TASK-CORE-006-2**: Legacy Bottom Panel Implementation
     - **Status**: Rewritten
     - **Reason**: Switched from custom grid layout to Radix DockablePanel primitives.
     - **Rewrite Target**: `TASK-CORE-006-7`
   ```
2. Append the replacement task (`TASK-CORE-006-7`) with `Status: Pending` or `Blocked`.

#### Strategy C: Cancel a Superseded Task
When a pending task is no longer necessary:
1. Update the task:
   ```markdown
   - **TASK-CORE-006-4**: Custom Title Bar Rendering
     - **Status**: Skipped/Canceled
     - **Reason**: Browser window frames provide sufficient OS controls per ADR-0005.
   ```

### Step 3: Recompute DAG Blocking Edges & Dynamic Frontier
- Update all `Blocked by` and downstream dependencies.
- Ensure no orphaned tasks or circular loops.
- Identify the updated unblocked `Pending` tasks dynamically (do NOT write a static `## 3. Active Frontier` section to the plan).

### Step 4: Reopen Plan & Epic Status
- In the plan's YAML frontmatter:
  ```yaml
  ---
  id: plan-ft-core-webui-shell
  type: plan
  aico_skills_version: "0.1.2"
  epic: "ec-core"
  title: "WebUI Application Shell, Navigation & Dockable Layout"
  status: "In Progress"
  ---
  ```
- If parent Epic was marked completed, reopen its `status` in its frontmatter to `In Progress`.
- Record the amendment in the single **Amendment Log** (`## 3. Amendment Log`):
  - **Single Header Rule**: If `## 3. Amendment Log` (or `## Amendment Log`) already exists, append new timestamped bullet points directly into the existing section. **NEVER create duplicate `## Amendment Log` headers**.
  - **No Static Frontier Section**: Do not generate a `## Active Frontier` section.

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
