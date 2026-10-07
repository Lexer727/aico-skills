---
name: aico-planning
description: "Decompose specifications into a Directed Acyclic Graph (DAG) of vertical tracer-bullet tasks, declaring explicit blocking dependencies and computing the active frontier."
disable-model-invocation: false
---

# AICO Planning: Task Graph, Vertical Tracer Bullets & Frontier Decomposition

Decompose specifications into an executable **task graph (DAG)** of vertical tracer bullets, mapping each task directly to specific EARS requirements with explicit blocking dependencies.

---

## 1. Vertical Tracer-Bullet & Task Rules

Break the work down using tracer-bullet vertical slices:
- **Vertical, not horizontal**: Each slice cuts a narrow path through every necessary layer (schema $\to$ logic $\to$ API $\to$ test), rather than doing "all schemas first, then all APIs".
- **Self-contained context**: Sized to fit comfortably in a single agent context window.
- **Traceable**: Every task must explicitly declare which `REQ-###` identifiers it addresses.
- **Clear Deliverables**: Bulleted, concrete artifacts, types, or methods delivered by the slice.
- **Designated Public Test Seam**: Explicit test file and function asserting the contract (`tests/...::test_...`).
- **Structured Task Statuses**:
  - `Pending`: Unblocked and queued for work.
  - `Blocked`: Waiting on dependency tasks.
  - `In Progress`: Actively being implemented or scaffolded.
  - `Done`: Implementation and tests verified green across public seams.
  - `Skipped/Canceled`: Explicitly discarded with mandatory `- **Reason**: ...`.
  - `Rewritten`: Replaced by an updated task with mandatory `- **Reason**: ...` and `- **Rewrite Target**: ...`.
- **Non-Destructive Task Mutations**: Never delete or silently overwrite outdated tasks. When amending existing plans or remediating defects in ongoing epics, use **`/aico-plan-amendment`**.

---

## 2. Blueprint & Schema Rules

1. **Mandatory Line-1 YAML Frontmatter**:
   - `id`: `plan-ft-{feature_slug}` (e.g. `plan-ft-core-discovery`, `plan-ft-fast-trace`).
   - `type: plan`
   - `aico_skills_version`: `"{aico_skills_version}"` (read dynamically from the `aico-skills/VERSION` file)
   - `epic`: `"ec-{short_id}"` (or `null` if standalone).
   - `order`: `<integer>` (governs visual sort sequence without altering directory names).
   - `title`: Human-readable capability title.
   - `status`: `Draft` | `Pending` | `In Progress` | `Completed`.
   - `repositories`: `["<repo_id>", ...]` (single source of truth declaring codebase repositories touched by this plan).
   - `derives_from`: List of derived `spec-ft-*` IDs.
   - `created_at`: ISO 8601 UTC timestamp.

### 2.1 Multi-Repo Traceability (Single Source of Truth)
- **Sole Authority**: Implementation plans are the single source of truth for codebase repository targeting. Specifications (`spec-ft-*.md`) describe domain requirements independently of target physical codebases.
- **Dynamic Roll-Up**: The WebUI, agents, and background inspection engines dynamically aggregate declared repositories from child feature plans up to Features, Epics, and the Home Dashboard without duplicate manual entries.
2. **Canonical Task Template**:
   ```markdown
   - **TASK-{prefix}-{suffix}-{seq}**: Task Title
     - **Status**: Pending
     - **Addresses**: `REQ-001`, `REQ-002`
     - **Blocked by**: None (Can start immediately)
     - **What it delivers**:
       - Primary deliverable or schema definition.
       - Core domain logic and route integration.
     - **Verification Seam**: `crate::module::test_function`
   ```

---

## 3. Process

### Step 1: Draft Vertical Slices
Examine `spec-ft-*.md` and identify the end-to-end paths required to satisfy all `REQ-###` items.

### Step 2: Establish Blocking Edges (DAG)
Assign explicit dependency prerequisites (`blocked_by: [TASK-..., ...]`).
- A task with no blockers can start immediately (`status: "Pending"`).
- Never introduce circular dependencies.

### Step 3: Dynamic Frontier Evaluation (No Static Markdown Section)
The Active Frontier is dynamically derived at runtime by evaluating each task's `Status` and its `Blocked by` dependency statuses:
```cypher
MATCH (t:Task {status: "pending"})
WHERE NOT EXISTS {
    MATCH (blocker:Task)-[:BLOCKS]->(t)
    WHERE blocker.status <> "done"
}
RETURN t.id AS ready_task
```
- **Dynamic Source of Truth**: Never write a static `## 3. Active Frontier` section in the plan markdown. Static sections become immediately obsolete when tasks progress.
- **Runtime Graph Traversal**: Tools, agents, and the WebUI dynamically determine which tasks are unblocked by checking if all prerequisite tasks in `Blocked by` have transitioned to `Done` or `Completed`.

