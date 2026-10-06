---
name: aico-planning
description: "Decompose specifications into a Directed Acyclic Graph (DAG) of vertical tracer-bullet tasks with flexible internal execution waves (Scaffolding, Implementation, Verification, Integration/Human Gate), declaring explicit blocking dependencies and computing the active frontier."
disable-model-invocation: false
---

# AICO Planning: Task Graph, Flexible Waves & Frontier Decomposition

Decompose specifications into an executable **task graph (DAG)** of vertical tracer bullets, mapping each task to specific EARS requirements and breaking each task into disciplined, **flexible internal execution waves**.

---

## 1. Vertical Tracer-Bullet & Task Rules

Break the work down using tracer-bullet vertical slices:
- **Vertical, not horizontal**: Each slice cuts a narrow path through every necessary layer (schema $\to$ logic $\to$ API $\to$ test), rather than doing "all schemas first, then all APIs".
- **Self-contained context**: Sized to fit comfortably in a single agent context window.
- **Traceable**: Every task must explicitly declare which `REQ-###` identifiers it addresses.
- **Flexible Internal Execution Waves**: Each task structures its delivery into internal waves. **Waves 1–4 are canonical stages, but they are optional per task**:
  - **Wave 1 (Scaffolding)**: Red interface contracts, stubs, and failing seam tests (`@verifies REQ-###`).
  - **Wave 2 (Implementation)**: Minimal green domain code turning seam tests green (`@implements REQ-###`).
  - **Wave 3 (Verification)**: Error edge cases, security invariants, benchmarks, and contract hardening.
  - **Wave 4 (Integration / Human Gate)**: End-to-end integration, UI wiring, and user acceptance confirmation.
  > *A task only includes the waves it actually requires. For example, a pure refactor or configuration task may only need Wave 1 & 2. A user-facing feature or risky security change might include Wave 1, 2, 3, and 4. A task is marked Done when all of its declared waves are completed.*
- **Structured Task Statuses**:
  - `Pending`: Unblocked and queued for work.
  - `Blocked`: Waiting on dependency tasks.
  - `In Progress`: Actively being implemented or scaffolded.
  - `Done`: Implementation and tests verified green across all declared waves.
  - `Skipped/Canceled`: Explicitly discarded with mandatory `- **Reason**: ...`.
  - `Rewritten`: Replaced by an updated task with mandatory `- **Reason**: ...` and `- **Rewrite Target**: ...`.
- **Non-Destructive Task Mutations**: Never delete or silently overwrite outdated tasks. When amending existing plans or remediating defects in ongoing epics, use **`/aico-plan-amendment`**.

---

## 2. Blueprint & Schema Rules

1. **Mandatory Line-1 YAML Frontmatter**:
   - `id`: `plan-ft-{feature_slug}` (e.g. `plan-ft-core-discovery`, `plan-ft-fast-trace`).
   - `type: plan`
   - `aico_version: "0.1.2"`
   - `epic`: `"ec-{short_id}"` (or `null` if standalone).
   - `order`: `<integer>` (governs visual sort sequence without altering directory names).
   - `title`: Human-readable capability title.
   - `status`: `Draft` | `Pending` | `In Progress` | `Completed`.
   - `derives_from`: List of derived `spec-ft-*` IDs.
   - `created_at`: ISO 8601 UTC timestamp.
2. **Canonical Task Template**:
   ```markdown
   - **TASK-{prefix}-{suffix}-{seq}**: Task Title
     - **Status**: Pending
     - **Addresses**: `REQ-001`, `REQ-002`
     - **Blocked by**: None (Can start immediately)
     - **Execution Waves**:
       - **Wave 1 (Scaffolding)**: Scaffold public trait/type signatures and red contract tests.
       - **Wave 2 (Implementation)**: Minimal core logic turning tests green.
       - **Wave 3 (Verification)**: Error handling, edge cases, and boundary assertions.
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

### Step 3: Define Internal Waves per Task
For each task, clearly outline its required internal execution waves (from Scaffolding, Implementation, Verification, to Integration / Human Gate). Do not force waves that the task does not need.

### Step 4: Compute the Active Frontier
Identify the set of unblocked tasks ready for immediate execution:
```cypher
MATCH (t:Task {status: "pending"})
WHERE NOT EXISTS {
    MATCH (blocker:Task)-[:BLOCKS]->(t)
    WHERE blocker.status <> "done"
}
RETURN t.id AS ready_task
```
Advance the frontier as tasks transition to `Done`.
