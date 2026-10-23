---
name: aico-implementation
description: "Implement minimal code to turn scaffolded red tests green, tagging source symbols with @implements annotations and advancing the task frontier."
disable-model-invocation: false
---

# AICO Implementation: Deterministic Green Loop

The second half of the red-to-green loop. Implement only enough production code to pass the scaffolded red tests, attach in-band traceability annotations, and advance the task frontier.

---

## 1. Implementation Discipline

- **Red before Green**: Never write code without a failing test already in place.
- **Minimal Implementation**: Write only enough code to satisfy the test. Do not anticipate speculative future requirements or add unrequested configuration knobs.
- **Respect Seams**: Implement behind the public interface agreed upon in the deep-dive and spec.
- **In-band Annotations**: Tag implementing functions, classes, or modules with the requirement they satisfy.

---

## 2. In-Band Implementation Tagging

Every public symbol satisfying an EARS requirement must include an in-band annotation:

```typescript
// @implements ft-<feature>::TASK-###::REQ-###
export function validateSessionToken(token: string): SessionVerdict {
  // minimal implementation
}
```

In Python:
```python
# @implements ft-<feature>::TASK-###::REQ-###
def validate_session_token(token: str) -> SessionVerdict:
    ...
```

In Rust:
```rust
// @implements ft-<feature>::TASK-###::REQ-###
pub fn validate_session_token(token: &str) -> Result<SessionVerdict, AuthError> {
    ...
}
```

AICO's Tree-sitter background watcher extracts these tags upon file save and commits the edge to Kùzu:
```cypher
MERGE (c:CodeSymbol {name: $symbol_name, file: $file_path})
MERGE (r:Requirement {id: $req_id})
MERGE (c)-[:IMPLEMENTS]->(r)
```

---

## 3. Process

1. **Pick the Active Red Test**: Focus strictly on the test file produced by `/aico-test-scaffolding`.
2. **Transition Task & Plan to In Progress via `aico-cli.mjs`**:
   ```bash
   node <skills-path>/scripts/aico-cli.mjs task-status --plan <path-to-plan.md> --task <TASK-ID> --status "In Progress"
   ```
   *(Automatically sets `plan-ft-*.md` and `spec-ft-*.md` frontmatter to `status: "In Progress"`).*
3. **Write Minimal Code**: Implement the logic behind the designated seam.
4. **Attach `@implements` Tags**: Generate canonical tags via `node <skills-path>/scripts/aico-cli.mjs trace-tags --spec <path-to-spec.md> --task <TASK-ID>` and annotate the relevant public symbols.
5. **Execute Verification**:
   - Run the local test runner until the suite turns **GREEN**.
   - Run local linters and typecheckers.
6. **Update Task & Advance Frontier via `aico-cli.mjs`**:
   - Transition the task to `Done` (which runs the `TaskCompletionGate`, automatically unblocks downstream `Blocked` tasks, and automatically rolls up `status: "Completed"` to `plan-ft-*.md`, `spec-ft-*.md`, and parent `brain-ec-*.md` when all tasks finish):
     ```bash
     node <skills-path>/scripts/aico-cli.mjs task-status --plan <path-to-plan.md> --task <TASK-ID> --status Done --code-dir <codebase-dir>
     ```
   - Query the updated active frontier:
     ```bash
     node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md>
     ```
7. **Automated Multi-Repo Git Stage, Commit & Push (REQ-005)**:
   - Upon verifying that red tests are green, linters pass, and the task is marked `Done`, the agent automatically stages all modified files, formulates a conventional commit message (e.g., `feat(<scope>): <description of verified task>`), commits, and pushes across all affected repositories (`aico`, `aico-specs`, `aico-skills`):
     ```bash
     # In each modified repository:
     git add -A
     git commit -m "feat(<scope>): <summary of task implementation>"
     git push
     ```
   - Automated git synchronization eliminates manual button clicking, ensuring remote repositories stay continuously in sync with verified code and specs.
8. **Next Step**:
   - If tasks remain on the frontier: Repeat with `/aico-test-scaffolding`.
   - If all tasks are completed: Advance to **`/aico-review-loop`** and **`/aico-verify`**.

---

## 4. Parallel Subagent Execution & Per-Task Model Routing (`invoke_subagent`)

When executing tasks along the active frontier, multiple tasks may become unblocked simultaneously:

### Ready Frontier Inspection
Inspect the active frontier dynamically via `aico-cli.mjs`:
```bash
node <skills-path>/scripts/aico-cli.mjs frontier --plan <path-to-plan.md> --json
```
If two or more tasks are in `ready_frontier` after Phase 3 confirmation, the workflow supports concurrent execution via parallel subagents.

### Seam Disjointness Check (REQ-004)
Inspect the designated verification seams and target source files for all unblocked tasks:
- **Disjoint Seams**: Tasks touch entirely separate files and test seams. They can execute concurrently without file collisions.
- **Overlapping Seams**: If two unblocked tasks touch overlapping files or verification seams, the agent **MUST serialize** their execution, executing one task to `Done` before starting the next.

### Per-Task Subagent Model Selection & Role Title Formatting (REQ-003, REQ-006)
Before dispatching parallel subagents, prompt the user for execution mode and per-task model overrides:
- **Default Model (`Model: "flash"`)**: If the user does not specify a custom model assignment, each subagent MUST default to `Model: "flash"` (the top normal Gemini model, currently **Gemini 3.8 Flash**). Subagent `Role` titles default to `(3.8 Flash High)` (e.g. `Role: "Task Implementer (3.8 Flash High)"`). Optional thinking effort levels for 3.8 Flash include `(3.8 Flash Low)`, `(3.8 Flash Medium)`, and `(3.8 Flash High)`.
- **High-Complexity Override (`Model: "inherit"` or `Model: "pro"`)**: For tasks requiring deep architectural reasoning, tricky edge-case debugging, or concurrency locking, assign `Model: "inherit"` (inheriting the parent session's frontier model, e.g., **Gemini 4 Argon High**) or `Model: "pro"`. The subagent `Role` title MUST explicitly reflect this: e.g. `Role: "Task Implementer (4 Argon High)"`.
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
  "Role": "Task Implementer (3.8 Flash High)",
  "Model": "flash",
  "Prompt": "Execute TASK-### from plan <path-to-plan.md>. Strictly modify only files within designated seam <seam>. Transition task status to In Progress and Done via aico-cli.mjs task-status."
}
```

**Complex Architecture Override (Gemini 4 Argon High)**:
```json
{
  "TypeName": "self",
  "Role": "Task Implementer (4 Argon High)",
  "Model": "inherit",
  "Prompt": "Execute TASK-### from plan <path-to-plan.md>. Strictly modify only files within designated seam <seam>. Transition task status to In Progress and Done via aico-cli.mjs task-status."
}
```
- **Seam Isolation**: Subagents MUST NOT edit files outside their designated seam.
- **Atomic Locking**: Subagents call `node <skills-path>/scripts/aico-cli.mjs task-status --plan <plan-file> --task <TASK-ID> --status Done` safely; concurrent writes are guarded by atomic `.lock` synchronization.
- **Parent Convergence**: The parent agent receives completion messages, verifies tests across seams, and advances the frontier.

---

## Completion Criteria
- [ ] All tests pass (GREEN).
- [ ] Linter and compiler checks pass clean.
- [ ] In-band `@implements` annotations attached.
- [ ] Task marked with structured `Status: Done` (or `Rewritten`/`Skipped/Canceled` with reason).
- [ ] Active frontier updated.
