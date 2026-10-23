---
name: aico-feature
description: "Universal atomic engine for feature scaffolding, specification, and execution (both standalone features and child features inside epics). Enforces ft- naming, optional epic container binding, EARS specifications, and vertical tracer-bullet task DAG planning."
disable-model-invocation: false
---

# AICO Feature: Universal Feature Scaffolding & Orchestration

`aico-feature` is the **single atomic engine** for creating, specifying, and orchestrating any feature in an AICO repository. It handles both:
1. **Standalone Features**: Self-contained capabilities living at `<specs-root>/features/ft-<feature_slug>/` (`epic: null`).
2. **Epic Child Features**: Subsystem milestones living at `<specs-root>/epics/ec-<short_id>/features/ft-<feature_slug>/` (`epic: "ec-<short_id>"`), invoked directly by **`/aico-epic`**.

---

## 1. Blueprint & Artifact Rules

1. **Mandatory `ft-` Feature Prefix**: Every feature folder and identifier must start with `ft-` (e.g. `features/ft-fast-trace/`, `features/ft-core-discovery/`). Never prefix with numbers like `01-`.
2. **Container Placement**:
   - **Standalone**: `<specs-root>/features/ft-<feature_slug>/`
   - **Epic Child**: `<specs-root>/epics/ec-<short_id>/features/ft-<feature_slug>/`
3. **Canonical Artifact Naming**:
   - Specification: `spec-ft-<feature_slug>.md` (Frontmatter `id: spec-ft-<feature_slug>`)
   - Implementation Plan: `plan-ft-<feature_slug>.md` (Frontmatter `id: plan-ft-<feature_slug>`)
   - Brainstorm (optional): `brain-ft-<feature_slug>.md`
   - Deep Dive (optional): `dive-ft-<feature_slug>.md`
4. **Universal Line-1 YAML Frontmatter**: Must include:
   - `id`: `spec-ft-<feature_slug>` (or `plan-ft-<feature_slug>`)
   - `type`: `spec` | `plan`
   - `aico_skills_version`: `"{aico_skills_version}"` (read dynamically from the `aico-skills/plugin.json` file)
   - `epic`: `"ec-<short_id>"` (if child feature) or `null` (if standalone)
   - `order`: `<integer>` (governs visual sort sequence)
   - `title`: Human-readable capability title
   - `status`: `Draft` | `Pending` | `In Progress` | `Completed`
   - `derives_from`: List of derived ADR IDs, Brainstorm IDs, or parent Epic IDs
   - `created_at`: ISO 8601 UTC timestamp
5. **Vertical Tracer-Bullet Tasks**: Implementation tasks within `plan-ft-<feature_slug>.md` represent narrow vertical slices with explicit `REQ-###` mapping, clear deliverables, `blocked_by` dependencies, and designated public test seams.

---

## 2. Invocation Context & Parameters

When invoked, `aico-feature` accepts:
- **`slug`**: The feature identifier (e.g. `fast-trace` or `core-discovery`). The tool ensures the `ft-` prefix (`ft-<slug>`).
- **`epic`** *(optional)*: Parent epic identifier (e.g. `ec-core`). If omitted or `null`, the feature is treated as standalone.
- **`target_dir`** *(optional)*: Override target directory path. Defaults to `<specs-root>/features/ft-<slug>/` for standalone, or `<specs-root>/epics/ec-<epic>/features/ft-<slug>/` for epic children.
- **`derives_from`** *(optional)*: List of parent documents (e.g. `["brain-ec-core"]`).

---

## 3. Process & Phase Separation

```
/aico-feature (Atomic Engine)
       │
       ▼ [PHASE 1: SCAFFOLDING & PLANNING]
       ├── 1. Resolve Path: features/ft-<slug>/ OR epics/ec-<id>/features/ft-<slug>/
       ├── 2. /aico-deep-dive (Analyze subsystem boundaries, blast radius & test seams)
       ├── 3. /aico-spec-creation (Draft spec-ft-<slug>.md with EARS requirements)
       └── 4. /aico-planning (Draft plan-ft-<slug>.md with vertical tasks in DAG)
       │
       ▼ [MANDATORY HUMAN APPROVAL GATE - STOP]
       │ (Halt! Present spec & plan to developer for review. Await explicit approval.)
       │
       ▼ [PHASE 2: DELIVERY EXECUTION - ONLY UPON USER APPROVAL]
       ├── 5. /aico-test-scaffolding (Failing red contract tests @verifies)
       ├── 6. /aico-implementation    (Minimal green domain code @implements)
       └── 7. /aico-review-loop       (Two-axis verification & review gate)
```

### Phase 1: Scaffolding & Planning

#### Step 1: Scaffold Feature Container via `aico-cli.mjs`
Run the deterministic feature scaffolder to create the target directory (`features/ft-<feature_slug>/` or `epics/ec-<short_id>/features/ft-<short_id>-<feature_slug>/`), compute the next `order` integer, validate `repositories` against `.aico-project.json`, and generate skeleton `spec-ft-*.md` and `plan-ft-*.md` files:
```bash
node <skills-path>/scripts/aico-cli.mjs scaffold-feature \
  --specs-dir <specs-root> \
  [--epic ec-<short_id>] \
  --slug <feature_slug> \
  --title "<Feature Title>" \
  --repos "<repo_id>" \
  [--derives-from "brain-ec-<short_id>,ADR-####"] \
  [--with-dive]
```

#### Step 2: System Boundary & Blast Radius Analysis
Invoke **`/aico-deep-dive`**:
- Identify touched crates, modules, and public exports (using MCP tool `query_lineage_graph` when available).
- Designate primary and secondary test seams.
- (Optional) Populate `dive-ft-<feature_slug>.md` if non-trivial architectural boundaries exist.

#### Step 3: Draft Formal EARS Specification
Invoke **`/aico-spec-creation`**:
- Write `spec-ft-<feature_slug>.md` with frontmatter:
  ```yaml
  ---
  id: spec-ft-<feature_slug>
  type: spec
  aico_skills_version: "{aico_skills_version}" # Read dynamically from aico-skills/plugin.json
  epic: <"ec-id" | null>
  order: 1
  title: "<Feature Title>"
  status: Draft
  derives_from: [<"brain-ec-id" | ADR>]
  created_at: "YYYY-MM-DDTHH:MM:SSZ"
  ---
  ```
- Formulate testable EARS requirements (`REQ-001..`) conforming strictly to canonical grammar patterns.
- Populate explicit `## In-Scope` and `## Out-of-Scope` boundaries.
- Designate public test seams in code.

#### Step 4: Decompose into Task Plan DAG
Invoke **`/aico-planning`**:
- Write `plan-ft-<feature_slug>.md` with frontmatter:
  ```yaml
  ---
  id: plan-ft-<feature_slug>
  type: plan
  aico_skills_version: "{aico_skills_version}" # Read dynamically from aico-skills/plugin.json
  epic: <"ec-id" | null>
  order: 1
  title: "<Feature Title> Implementation Plan"
  status: Draft
  repositories: ["{repo_id}"]
  derives_from: ["spec-ft-<feature_slug>"]
  created_at: "YYYY-MM-DDTHH:MM:SSZ"
  ---
  ```
- Structure tasks into vertical tracer bullets with explicit `blocked_by` dependencies.

#### Step 5: Human Review & Approval Gate (MANDATORY STOP)
> [!IMPORTANT]
> **Phase 1 Concludes Here**: Once `spec-ft-*.md` and `plan-ft-*.md` are generated and verified, the agent **MUST STOP**.
> - Output `[AICO GATE: Waiting for Confirmation]` to clearly signal the review gate to the developer and terminal monitors.
> - Present the EARS requirements, designated test seams, and DAG task plan to the developer.
> - **DO NOT start Phase 2 (Test Scaffolding or Implementation)** without explicit developer confirmation to begin.
> - Never assume approval or bundle planning and code changes into a single turn.

---

### Phase 2: Delivery Execution (Only After Developer Approval)

#### Step 6: Test Scaffolding & Implementation
Triggered ONLY after the developer explicitly approves the plan:
1. Invoke **`/aico-test-scaffolding`** to write failing contract tests (`@verifies`).
2. Invoke **`/aico-implementation`** to write green code (`@implements`).
3. Run `/aico-review-loop` and update frontmatter status to `Completed`.

---

## 4. Parallel Subagent Execution & Per-Task Model Routing (`invoke_subagent`)

When executing tasks along the feature plan DAG during Phase 2 (Delivery Execution):

### Ready Frontier Inspection
Evaluate the active frontier dynamically via `aico-cli.mjs`:
```bash
node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md> --json
```
If two or more tasks reside on `ready_frontier` simultaneously after Phase 1 approval, the feature workflow supports concurrent execution via parallel subagents.

### Seam Disjointness Check (REQ-004)
Inspect candidate tasks for file and seam independence:
- **Disjoint Seams**: Tasks modify completely separate files, modules, and test seams. These tasks can be safely executed in parallel.
- **Overlapping Seams**: If two unblocked tasks touch overlapping source files or verification seams, the agent **MUST serialize** their execution to prevent workspace merge conflicts.

### Per-Task Subagent Model Selection & Role Title Formatting (REQ-003, REQ-006)
Before dispatching parallel subagents, prompt the user for execution options and per-task model overrides:
- **Default Model (`Model: "flash"`)**: If the user does not specify a custom model assignment, each subagent MUST default to `Model: "flash"` (the top normal Gemini model, currently **Gemini 3.8 Flash**). Subagent `Role` titles default to `(3.8 Flash High)` (e.g. `Role: "Feature Task Implementer (3.8 Flash High)"`). Optional thinking effort levels for 3.8 Flash include `(3.8 Flash Low)`, `(3.8 Flash Medium)`, and `(3.8 Flash High)`.
- **High-Complexity Override (`Model: "inherit"` or `Model: "pro"`)**: For tasks involving complex architectural refactoring or tricky algorithms designated by the user, specify `Model: "inherit"` (inheriting the parent session's frontier model, e.g., **Gemini 4 Argon High**) or `Model: "pro"`. The subagent `Role` title MUST explicitly reflect this: e.g. `Role: "Feature Task Implementer (4 Argon High)"`.
- **Explicit Role Tag Format**: Every subagent dispatched via `invoke_subagent` MUST append the exact `<Version> <Model> <Effort>` tag to its `Role` parameter:
  - Default: `<Role Title> (3.8 Flash High)`
  - Effort variants: `<Role Title> (3.8 Flash Low)`, `<Role Title> (3.8 Flash Medium)`
  - Complex override: `<Role Title> (4 Argon High)`
  - Future models (e.g., `4 Flash High`): `<Role Title> (4 Flash High)`

### Subagent Dispatch Protocol (REQ-002, REQ-003, REQ-006)
Dispatch each disjoint unblocked task using `invoke_subagent`:

**Default Execution (Gemini 3.8 Flash High)**:
```json
{
  "TypeName": "self",
  "Role": "Feature Task Implementer (3.8 Flash High)",
  "Model": "flash",
  "Prompt": "Execute TASK-### from plan <path-to-plan.md>. Strictly modify only files within designated seam <seam>. Transition task status to In Progress and Done via aico-cli.mjs task-status."
}
```

**Complex Architecture Override (Gemini 4 Argon High)**:
```json
{
  "TypeName": "self",
  "Role": "Feature Task Implementer (4 Argon High)",
  "Model": "inherit",
  "Prompt": "Execute TASK-### from plan <path-to-plan.md>. Strictly modify only files within designated seam <seam>. Transition task status to In Progress and Done via aico-cli.mjs task-status."
}
```
- Each subagent executes test scaffolding and implementation strictly within its designated seam.
- Subagents commit task status transitions using `node <skills-path>/scripts/aico-cli.mjs task-status`, synchronized by atomic `.lock` files.
- The parent feature orchestrator waits for completion, runs `/aico-review-loop`, and confirms all seams pass.

---

## Completion Criteria (Phase 1: Scaffolding & Planning)
- [ ] Feature directory created with `ft-` prefix (`features/ft-<slug>/` or `epics/ec-<id>/features/ft-<slug>/`).
- [ ] Deep dive blast radius analyzed and seams designated.
- [ ] `spec-ft-<slug>.md` drafted with canonical frontmatter (`epic: "ec-<id>"` or `null`).
- [ ] `plan-ft-<slug>.md` drafted with vertical tracer-bullet tasks, repositories array, and explicit DAG dependencies.
- [ ] Visible in the AICO WebUI (Epic Hub or Standalone Feature Hub).
- [ ] **Agent output `[AICO GATE: Waiting for Confirmation]` and halted at the Human Review Gate to request user approval before writing any code.**
