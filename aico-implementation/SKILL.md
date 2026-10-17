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
2. **Transition Plan & Task to In Progress**:
   - Ensure `PLAN-*.md` frontmatter has `status: "In Progress"`.
   - Update current task in `PLAN-*.md` to `- **Status**: In Progress`.
3. **Write Minimal Code**: Implement the logic behind the designated seam.
4. **Attach `@implements` Tags**: Annotate the relevant public symbols.
5. **Execute Verification**:
   - Run the local test runner until the suite turns **GREEN**.
   - Run local linters and typecheckers.
6. **Update Task & Advance Frontier**:
   - In `PLAN-*.md`, set current task to `- **Status**: Done`.
   - If a task is replaced or canceled due to architectural change, set `- **Status**: Rewritten` or `- **Status**: Skipped/Canceled` with mandatory `- **Reason**: ...` and `- **Rewrite Target**: ...`.
   - Update Kùzu task state (`SET t.status = 'completed'`).
   - Query Kùzu for newly unblocked tasks:
     ```cypher
     MATCH (t:Task)
     WHERE t.status IN ["pending", "ready"] 
       AND NOT EXISTS { MATCH (b:Task)-[:BLOCKS]->(t) WHERE b.status <> "completed" }
     RETURN t
     ```
7. **Next Step**:
   - If tasks remain on the frontier: Repeat with `/aico-test-scaffolding`.
   - If all tasks are completed: Set `status: "Completed"` in frontmatter of `PLAN-*.md` and `SPEC-*.md`, then advance to **`/aico-review-loop`**.

---

## Completion Criteria
- [ ] All tests pass (GREEN).
- [ ] Linter and compiler checks pass clean.
- [ ] In-band `@implements` annotations attached.
- [ ] Task marked with structured `Status: Done` (or `Rewritten`/`Skipped/Canceled` with reason).
- [ ] Active frontier updated.
