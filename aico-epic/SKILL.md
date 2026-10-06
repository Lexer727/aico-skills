---
name: aico-epic
description: "Scaffold, frame, and orchestrate a multi-feature engineering epic. Coordinates shared brainstorming, child feature decomposition under features/ft- via internal /aico-feature calls, and tracks cross-feature milestone convergence."
disable-model-invocation: false
---

# AICO Epic: Multi-Feature Capability Framing & Orchestration

An **Epic** is the strategic container for large initiatives that decompose into multiple child features and milestones. It is identified by the canonical prefix `ec-<short_id>` (e.g. `ec-core`, `ec-specs`), bundling an overarching brainstorm (`brain-ec-<short_id>.md`) and child feature specifications under `features/ft-<feature_slug>/`.

> **Architecture Principle**: `aico-epic` does **not** redundantly define how to create features. Instead, it frames the container and overarching architecture, and **internally invokes `/aico-feature`** to scaffold and specify each child feature.

---

## 1. Blueprint & Artifact Rules

1. **Epic Container Naming**: Always use `epics/ec-<short_id>/` (e.g. `epics/ec-core/`, `epics/ec-specs/`). Never prefix with sequence numbers like `001-`.
2. **Child Features Directory**: Child features are stored under `epics/ec-<short_id>/features/ft-{short_id}-{feature_suffix}/` (e.g. `features/ft-core-host-runtime/`).
3. **Mandatory `ft-` Feature Prefix**: Every child feature must have the `ft-` prefix.
4. **Decoupled Ordering**: Visual and execution sequence is declared via `order: <number>` in YAML frontmatter, never by prefixing directory or filenames with numbers.
5. **Universal Line-1 YAML Frontmatter**: Every artifact (`brain-ec-*.md`, `spec-ft-*.md`, `plan-ft-*.md`) must include canonical frontmatter with `id`, `type`, `aico_version: "0.1.2"`, `epic: "ec-{short_id}"`, `order: <number>`, `title`, `status`, `derives_from`, and `created_at`.
6. **Strict Relative Linking**: All cross-document links must use portable relative markdown paths (e.g. `../../adr/...`), never absolute `file:///` URLs.

---

## 2. Process

```
From /aico-start ───> /aico-epic ───> Scaffold Container ───> Draft brain-ec-<id>.md ───> Decompose Child Features
                     (Triage Match)    (epics/ec-<id>/)       (Overarching Concept)        (calls /aico-feature)
```

### Step 1: Scope & Scaffold the Epic Container
1. Resolve `<project>-specs/epics/ec-{short_id}/` using a concise, descriptive identifier (e.g. `ec-core`, `ec-specs`, `ec-workspace`).
2. Create the container directory and its child `features/` directory:
   - `<project>-specs/epics/ec-{short_id}/`
   - `<project>-specs/epics/ec-{short_id}/features/`

### Step 2: Overarching Concept & Shared Brainstorm
1. Ingest problem statement, cross-cutting architectural trade-offs, and candidate alternatives gathered in `/aico-start`.
2. Write the shared brainstorm artifact with frontmatter:
   `<project>-specs/epics/ec-{short_id}/brain-ec-{short_id}.md`
   ```yaml
   ---
   id: brain-ec-{short_id}
   type: brainstorm
   aico_version: "0.1.2"
   epic: "ec-{short_id}"
   title: "Epic Title"
   status: In Progress
   derives_from: ["ADR-####"]
   created_at: "YYYY-MM-DDTHH:MM:SSZ"
   ---
   ```

### Step 3: Decompose into Child Features via `/aico-feature`
1. Break down the overarching initiative into cohesive child feature slugs:
   - `ft-{short_id}-{feature_1}`
   - `ft-{short_id}-{feature_2}`
2. For **each child feature**, invoke **`/aico-feature`** with:
   - `slug`: `ft-{short_id}-{feature_n}`
   - `epic`: `"ec-{short_id}"`
   - `target_dir`: `epics/ec-{short_id}/features/ft-{short_id}-{feature_n}/`
   - `derives_from`: `["brain-ec-{short_id}"]`
3. `/aico-feature` runs the deep-dive, drafts `spec-ft-*.md`, and constructs `plan-ft-*.md` with vertical tracer-bullet tasks and flexible internal waves.

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
- All child features have passing red-to-green seam tests across all declared internal waves.
- Standards vs Spec two-axis review has passed (`/aico-review-loop`).
- All human gate tasks in the Plan DAG are satisfied.
- Frontmatter status for the epic brainstorm and all child specs/plans is updated to `Completed`.

---

## Completion Criteria
- [ ] Epic directory created under `<project>-specs/epics/ec-{short_id}/features/`.
- [ ] Overarching brainstorm saved as `brain-ec-{short_id}.md`.
- [ ] Child feature directories created under `features/` with `ft-` prefix.
- [ ] Child features created via `/aico-feature` calls.
- [ ] All child specs and plans declare `order: <number>`, `aico_version: "0.1.2"`, and `epic: "ec-{short_id}"`.
- [ ] Tasks declare flexible internal execution waves.
- [ ] Epic visible in the AICO WebUI Epic Hub.
