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
   - `aico_skills_version`: `"{aico_skills_version}"` (read dynamically from the `aico-skills/plugin.json` file)
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

### Step 3: Dynamic Frontier Evaluation via `aico-cli.mjs` (No Static Markdown Section)
The Active Frontier is dynamically derived at runtime by evaluating each task's `Status` and its `Blocked by` dependency statuses via `aico-cli.mjs`:
```bash
node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md>
# Or across an entire epic/workspace:
node <skills-path>/scripts/aico-cli.mjs frontier --specs-dir <specs-root> [--epic ec-<id>]
```
- **Dynamic Source of Truth**: Never write a static `## 3. Active Frontier` section in the plan markdown. Static sections become immediately obsolete when tasks progress.
- **Runtime Graph Traversal**: `aico-cli.mjs frontier` validates the DAG for circular dependencies and determines which tasks are unblocked by checking if all prerequisite tasks in `Blocked by` have transitioned to `Done`.

### Step 4: Human Review & Approval Gate (MANDATORY STOP)
> [!IMPORTANT]
> **Planning Concludes Here**: Once the task DAG is generated and verified against the specification, the planning skill is **complete**.
> - **MANDATORY STOP**: The agent MUST STOP and present the plan to the developer. Highlight:
>   1. The initial unblocked frontier tasks (`status: "Pending"`).
>   2. Target repositories declared in `repositories: [...]`.
>   3. Designated public test seams.
> - **DO NOT begin implementation** without explicit user review and instruction to execute.

---

## 4. Parallel Subagent Execution & Per-Task Model Routing (`invoke_subagent`)

When decomposing specifications into vertical tracer bullets, the resulting DAG often surfaces multiple tasks that can start concurrently:

### Ready Frontier Inspection
Evaluate the active frontier dynamically via `aico-cli.mjs`:
```bash
node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md> --json
# Or across an entire epic:
node <skills-path>/scripts/aico-cli.mjs frontier --specs-dir <specs-root> --epic ec-<id> --json
```
If two or more tasks reside on `ready_frontier` simultaneously, they are candidates for parallel subagent execution.

### Seam Disjointness Check (REQ-004)
Before recommending parallel execution, verify whether unblocked frontier tasks touch disjoint source files and verification seams:
- **Disjoint Seams**: Tasks modify completely separate files, modules, and test seams. These tasks can be safely dispatched in parallel.
- **Overlapping Seams**: If two or more unblocked tasks modify shared source files, shared test files, or overlapping verification seams, the orchestration workflow **MUST serialize** their execution rather than running them concurrently in the same workspace.

### Per-Task Subagent Model Selection & Role Title Formatting (REQ-003, REQ-006)
Before dispatching parallel subagents, prompt the user for per-task model overrides:
- **Default Model (`Model: "flash"`)**: If the user does not specify a custom model assignment, each subagent MUST default to `Model: "flash"` (the top normal Gemini model, currently **Gemini 3.8 Flash**), providing fast and cost-effective execution. Subagent `Role` titles default to `(3.8 Flash High)` (e.g. `Role: "Task Implementer (3.8 Flash High)"`). Optional thinking effort levels for 3.8 Flash include `(3.8 Flash Low)`, `(3.8 Flash Medium)`, and `(3.8 Flash High)`.
- **High-Complexity Override (`Model: "inherit"` or `Model: "pro"`)**: For tasks involving complex architectural trade-offs, stateful concurrency, or storage engine invariants designated by the user, specify `Model: "inherit"` (inheriting the parent session's frontier model, e.g., **Gemini 4 Argon High**) or `Model: "pro"`. The subagent `Role` title MUST explicitly reflect this: e.g. `Role: "Task Implementer (4 Argon High)"`.
- **Explicit Role Tag Format**: Every subagent dispatched via `invoke_subagent` MUST append the exact `<Version> <Model> <Effort>` tag to its `Role` parameter:
  - Default: `<Role Title> (3.8 Flash High)`
  - Effort variants: `<Role Title> (3.8 Flash Low)`, `<Role Title> (3.8 Flash Medium)`
  - Complex override: `<Role Title> (4 Argon High)`
  - Future models (e.g., `4 Flash High`): `<Role Title> (4 Flash High)`

### Subagent Dispatch Protocol (REQ-002, REQ-003, REQ-006)
Once the developer approves parallel execution, dispatch independent subagents via `invoke_subagent`:

**Default Execution (Gemini 3.8 Flash High)**:
```json
{
  "TypeName": "self",
  "Role": "Task Implementer (3.8 Flash High)",
  "Model": "flash",
  "Prompt": "Implement TASK-### scoped strictly to its designated seam..."
}
```

**Complex Architecture Override (Gemini 4 Argon High)**:
```json
{
  "TypeName": "self",
  "Role": "Task Implementer (4 Argon High)",
  "Model": "inherit",
  "Prompt": "Implement TASK-### scoped strictly to its designated seam..."
}
```
- Each subagent is strictly scoped to its assigned `TASK-*` and designated seam.
- Subagents commit task status transitions using `node <skills-path>/scripts/aico-cli.mjs task-status`, which synchronizes writes using atomic `.lock` files.
