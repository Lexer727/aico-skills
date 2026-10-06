---
name: aico-epic
description: "Scaffold, frame, and orchestrate a multi-feature engineering epic. Coordinates shared brainstorming, child feature decomposition under features/, tracks cross-feature milestone convergence, and enforces EC- naming with YAML frontmatter ordering."
disable-model-invocation: false
---

# AICO Epic: Multi-Feature Capability Framing & Orchestration

An **Epic** is the strategic container for large initiatives that decompose into multiple child features and milestones. It is identified by the canonical prefix `EC-{short_id}` (e.g. `EC-core`, `EC-specs`), bundling an overarching brainstorm (`BRAIN-EC-{short_id}.md`) and child feature specifications under `features/`.

> **Note**: For self-contained, single-capability additions or utilities, use **`/aico-feature`** directly. Use **`/aico-start`** as the universal front door to triage between an Epic and a Standalone Feature.

---

## 1. Blueprint & Artifact Rules

1. **Epic Container Naming**: Always use `epics/EC-{short_id}/` (e.g. `epics/EC-core/`, `epics/EC-specs/`). Never prefix with sequence numbers like `001-`.
2. **Child Features Directory**: Child features are stored under `epics/EC-{short_id}/features/{short_id}-{feature_suffix}/` (e.g. `features/core-host-runtime/`).
3. **Decoupled Ordering**: Visual and execution sequence is declared via `order: <number>` in YAML frontmatter, never by prefixing directory or filenames with `01-`, `02-`.
4. **Universal Line-1 YAML Frontmatter**: Every artifact (`BRAIN-EC-*.md`, `SPEC-*.md`, `PLAN-*.md`) must include canonical frontmatter with `id`, `type`, `aico_version: "0.1.2"`, `epic: "EC-{short_id}"`, `order: <number>`, `title`, `status`, `derives_from`, and `created_at`.
5. **Wave-Internal Task Execution**: Implementation tasks within child feature plans declare internal execution waves:
   - **Wave 1 (Scaffolding)**: Red interface contracts and failing seam tests (`@verifies REQ-###`).
   - **Wave 2 (Implementation)**: Minimal green code turning seam tests green (`@implements REQ-###`).
   - **Wave 3 (Verification)**: Error edge cases, security invariants, and contract hardening.
   - **Wave 4 (Integration / Human Gate)**: End-to-end integration and user verification.
6. **Strict Relative Linking**: All cross-document links must use portable relative markdown paths (e.g. `../../adr/...`), never absolute `file:///` URLs.

---

## 2. Process

```
From /aico-start ───> /aico-epic ───> Scaffold Container ───> Draft BRAIN-EC-<id>.md ───> Decompose Features
                     (Triage Match)     (epics/EC-<id>/)      (Overarching Concept)        (under features/)
```

### Step 1: Scope & Scaffold the Epic Container
1. Resolve `<project>-specs/epics/EC-{short_id}/` using a concise, descriptive identifier (e.g. `EC-core`, `EC-specs`, `EC-workspace`).
2. Create the container directory and its child `features/` directory:
   - `<project>-specs/epics/EC-{short_id}/`
   - `<project>-specs/epics/EC-{short_id}/features/`

### Step 2: Overarching Concept & Shared Brainstorm
1. Ingest problem statement, cross-cutting architectural trade-offs, and candidate alternatives gathered in `/aico-start`.
2. Write the shared brainstorm artifact with frontmatter:
   `<project>-specs/epics/EC-{short_id}/BRAIN-EC-{short_id}.md`
   ```yaml
   ---
   id: BRAIN-EC-{short_id}
   type: brainstorm
   aico_version: "0.1.2"
   epic: "EC-{short_id}"
   title: "Epic Title"
   status: In Progress
   derives_from: ["ADR-####"]
   created_at: "YYYY-MM-DDTHH:MM:SSZ"
   ---
   ```

### Step 3: Decompose into Child Features
1. Break down the overarching initiative into cohesive child feature directories:
   - `<project>-specs/epics/EC-{short_id}/features/{short_id}-{feature_1}/`
   - `<project>-specs/epics/EC-{short_id}/features/{short_id}-{feature_2}/`
2. For each child feature:
   - Run `/aico-deep-dive` to analyze that subsystem's blast radius and public seams.
   - Run `/aico-spec-creation` to draft its EARS contract (`SPEC-{short_id}-{feature}.md`) with `order: <number>`.
   - Run `/aico-planning` to build its vertical tracer-bullet DAG (`PLAN-{short_id}-{feature}.md`) with wave-internal tasks and `order: <number>`.

### Step 4: Register in Kùzu Property Graph
Register the epic and its relationships:
```cypher
MERGE (e:Epic {id: $epic_id, title: $title, status: "in_progress"})
MERGE (b:Brainstorm {id: $brain_id})
MERGE (e)-[:HAS_BRAINSTORM]->(b)
// For each child feature spec:
MERGE (s:Spec {id: $spec_id, order: $order})
MERGE (e)-[:HAS_SPEC]->(s)
MERGE (s)-[:DERIVED_FROM]->(b)
```

### Step 5: Cross-Feature Milestone Convergence
An epic reaches completion only when:
- All child features have passing red-to-green seam tests across all internal waves.
- Standards vs Spec two-axis review has passed (`/aico-review-loop`).
- All human gate tasks in the Plan DAG are satisfied.
- Frontmatter status for the epic brainstorm and all child specs/plans is updated to `Completed`.

---

## Completion Criteria
- [ ] Epic directory created under `<project>-specs/epics/EC-{short_id}/features/`.
- [ ] Overarching brainstorm saved as `BRAIN-EC-{short_id}.md`.
- [ ] Child feature directories created under `features/` without numeric prefixes.
- [ ] All child specs and plans declare `order: <number>` and `aico_version: "0.1.2"`.
- [ ] Tasks declare internal execution waves.
- [ ] Epic visible in the AICO WebUI Epic Hub.
