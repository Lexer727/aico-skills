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
7. **Next Step**:
   - If tasks remain on the frontier: Repeat with `/aico-test-scaffolding`.
   - If all tasks are completed: Advance to **`/aico-review-loop`** and **`/aico-verify`**.

---

## Completion Criteria
- [ ] All tests pass (GREEN).
- [ ] Linter and compiler checks pass clean.
- [ ] In-band `@implements` annotations attached.
- [ ] Task marked with structured `Status: Done` (or `Rewritten`/`Skipped/Canceled` with reason).
- [ ] Active frontier updated.
