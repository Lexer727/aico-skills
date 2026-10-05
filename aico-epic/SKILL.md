---
name: aico-epic
description: "Scaffold, frame, and orchestrate a new engineering epic. Coordinates shared brainstorming, decides simple vs composite multi-spec decomposition, and tracks cross-spec milestone convergence with universal YAML frontmatter and relative linking."
disable-model-invocation: false
---

# AICO Epic: Capability Framing & Multi-Spec Orchestration

An **Epic** is the top-level unit of intent and execution under a Project. It bundles a cohesive idea from conception to verified code, serving as the parent container for all associated SDD artifacts (shared brainstorms, deep dives, specifications, and task plans).

Use `/aico-epic` when starting a new capability, epic, or feature set.

---

## 1. Blueprint & Artifact Rules

1. **Universal Line-1 YAML Frontmatter**: Every artifact (`BRAIN-*.md`, `SPEC-*.md`, `PLAN-*.md`) must include canonical frontmatter with `id`, `type`, `aico_version: "0.1.1"`, `title`, `status`, `derives_from`, and `created_at`.
2. **Single Source of Truth**: Never duplicate frontmatter metadata attributes in the markdown body.
3. **Strict Relative Linking**: All internal links across documents must be relative markdown paths (`../../adr/...`), never absolute `file:///` URLs.
4. **4-State Lifecycle**: `Draft` $\to$ `Pending` $\to$ `In Progress` $\to$ `Completed`.
5. **6-State Task Tracking**: In plans, tasks use explicit `Status: Pending | In Progress | Done | Blocked | Skipped/Canceled | Rewritten`. Any canceled or rewritten tasks must include `Reason` and `Rewrite Target`.

---

## 2. Process

```
New Idea ───> /aico-epic ───> Scaffold Container ───> /aico-brainstorm ───> Simple or Composite?
                              (<slug>/)              (Shared Brainstorm)    │
                                                                           ├──> Simple: 1 Spec directly
                                                                           └──> Composite: Decompose into child specs
```

### Step 1: Scope & Scaffold the Epic
1. Verify the active project (resolves `<aico-root>/<project>-specs/`).
2. Assign a sequential slug: `epics/<seq>-<epic-slug>/` (e.g. `001-aico-core`, `002-aico-specs`).
3. Create the epic container directory:
   `<project>-specs/epics/<seq>-<slug>/`

### Step 2: Overarching Concept & Shared Brainstorm
1. Invoke **`/aico-brainstorm`** targeting the whole epic.
2. Socratic grilling identifies:
   - Problem statement & measurable user value.
   - Cross-cutting architectural trade-offs (e.g. communication protocol, shared data schemas).
   - Candidate approaches & rejected alternatives.
3. Write the shared brainstorm artifact with frontmatter:
   `<project>-specs/epics/<seq>-<slug>/BRAIN-<slug>.md`

### Step 3: Determine Epic Structure (Simple vs. Composite)
Ask the developer:
> *"Does this epic implement as a single cohesive unit, or does it decompose into distinct child specifications (e.g. Backend API vs. Frontend WebUI)?"*

- **Path A: Simple Epic (Single Spec)**:
  - Keep a flat structure inside `epics/<seq>-<slug>/`:
    - `BRAIN-<slug>.md`
    - `DEEP-<slug>.md` (blast radius analysis via `/aico-deep-dive`)
    - `SPEC-<slug>.md` (EARS requirements via `/aico-spec-creation`)
    - `PLAN-<slug>.md` (task DAG via `/aico-planning`)
- **Path B: Composite Epic (Multi-Spec)**:
  - Create child spec subdirectories under `specs/`:
    - `<project>-specs/epics/<seq>-<slug>/specs/01-<child-slug>/`
    - `<project>-specs/epics/<seq>-<slug>/specs/02-<child-slug>/`
  - For each child spec:
    - Run `/aico-deep-dive` to analyze that specific subsystem's blast radius.
    - Run `/aico-spec-creation` to draft its EARS contract (`SPEC-<child-slug>.md`).
    - Run `/aico-planning` to build its vertical tracer-bullet DAG (`PLAN-<child-slug>.md`).

### Step 4: Register in Kùzu Property Graph
Register the epic and its relationships:
```cypher
MERGE (e:Epic {id: $epic_id, title: $title, status: "pending"})
MERGE (b:Brainstorm {id: $brain_id})
MERGE (e)-[:HAS_BRAINSTORM]->(b)
// For each child spec:
MERGE (s:Spec {id: $spec_id})
MERGE (e)-[:HAS_SPEC]->(s)
MERGE (s)-[:DERIVED_FROM]->(b)
```

### Step 5: Cross-Spec Milestone Convergence
An epic reaches completion only when:
- All child specifications have passing red-to-green seam tests.
- Standards vs Spec two-axis review has passed (`/aico-review-loop`).
- All human gate tasks in the Plan DAG are satisfied.
- Frontmatter status for the epic and all child specs/plans is updated to `Completed`.

---

## Completion Criteria
- [ ] Epic folder created under `<project>-specs/epics/<seq>-<slug>/`.
- [ ] Shared brainstorm completed with line-1 YAML frontmatter and saved.
- [ ] Structural path selected (Simple flat vs. Composite multi-spec).
- [ ] Child specs created or ready for `/aico-spec-creation`.
- [ ] All cross-document links use relative paths.
- [ ] Epic visible in the AICO UI Epic Hub.
