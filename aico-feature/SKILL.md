---
name: aico-feature
description: "Scaffold, design, and orchestrate a standalone feature without an epic container. Manages deep-dive blast radius, EARS specification drafting with epic: null, and vertical tracer-bullet task DAG planning."
disable-model-invocation: false
---

# AICO Feature: Standalone Feature Scaffolding & Orchestration

`aico-feature` is used to create and orchestrate **Standalone Features** that operate outside an epic container. Standalone features are self-contained capabilities, utilities, extensions, or bug-fix refactors that live directly under `<specs-root>/features/<feature-slug>/`.

---

## 1. Blueprint & Artifact Rules

1. **Top-Level Placement**: Standalone features live at `<specs-root>/features/<feature-slug>/` (not inside `epics/`).
2. **Universal Line-1 YAML Frontmatter**: Must include `id: SPEC-{feature-slug}`, `type: spec`, `aico_version: "0.1.2"`, `epic: null`, `order: <number>`, `title`, `status`, `derives_from`, and `created_at`.
3. **Decoupled Ordering**: Use the frontmatter `order: <number>` attribute for visual sequence. Do not prefix folder names with numbers (use `features/export-pdf/`, not `features/01-export-pdf/`).
4. **Wave-Internal Task Execution**: Implementation tasks within `PLAN-{feature-slug}.md` must declare their internal execution waves:
   - **Wave 1 (Scaffolding)**: Red interface contracts and failing seam tests (`@verifies REQ-###`).
   - **Wave 2 (Implementation)**: Minimal green code turning seam tests green (`@implements REQ-###`).
   - **Wave 3 (Verification)**: Error edge cases, security invariants, and contract hardening.
   - **Wave 4 (Integration / Human Gate)**: End-to-end integration and user verification.

---

## 2. Process

```
From /aico-start ───> /aico-feature ───> /aico-deep-dive ───> /aico-spec-creation ───> /aico-planning
                     (Scaffold Container) (Blast Radius)       (SPEC-*.md, epic:null)    (PLAN-*.md with waves)
```

### Step 1: Scaffold Feature Container
1. Resolve `<specs-root>/features/<feature-slug>/` using a concise, descriptive kebab-case name (e.g. `features/export-pdf/`, `features/cli-auth/`).
2. Create the directory.

### Step 2: System Boundary & Blast Radius Analysis
1. Invoke **`/aico-deep-dive`** on the specific target subsystem:
   - Identify touched crates, modules, and public exports.
   - Designate primary and secondary test seams.
   - (Optional) Save `DIVE-{feature-slug}.md` inside the feature directory if non-trivial architectural boundaries exist.

### Step 3: Draft Formal EARS Specification
1. Invoke **`/aico-spec-creation`**:
   - Write `<specs-root>/features/<feature-slug>/SPEC-{feature-slug}.md`.
   - Set YAML frontmatter:
     ```yaml
     ---
     id: SPEC-{feature-slug}
     type: spec
     aico_version: "0.1.2"
     epic: null
     order: 1
     title: "Feature Title"
     status: Draft
     derives_from: ["ADR-####"]
     created_at: "YYYY-MM-DDTHH:MM:SSZ"
     ---
     ```
   - Formulate EARS requirements (`REQ-001..`) conforming strictly to canonical grammar patterns.
   - Designate public test seams in code.

### Step 4: Decompose into Task Plan DAG
1. Invoke **`/aico-planning`**:
   - Write `<specs-root>/features/<feature-slug>/PLAN-{feature-slug}.md`.
   - Set YAML frontmatter:
     ```yaml
     ---
     id: PLAN-{feature-slug}
     type: plan
     aico_version: "0.1.2"
     epic: null
     order: 1
     title: "Feature Implementation Plan"
     status: Draft
     derives_from: ["SPEC-{feature-slug}"]
     created_at: "YYYY-MM-DDTHH:MM:SSZ"
     ---
     ```
   - Structure tasks into vertical tracer bullets with explicit internal execution waves (Wave 1 Scaffolding $\to$ Wave 2 Implementation $\to$ Wave 3 Verification).

### Step 5: Test Scaffolding & Implementation
1. Invoke **`/aico-test-scaffolding`** to write failing contract tests (`Wave 1`).
2. Invoke **`/aico-implementation`** to write green code (`Wave 2`).
3. Verify all tests pass green, run `/aico-review-loop`, and update status to `Completed`.

---

## Completion Criteria
- [ ] Feature directory created at `<specs-root>/features/<feature-slug>/`.
- [ ] Deep dive blast radius analyzed.
- [ ] `SPEC-{feature-slug}.md` drafted with canonical frontmatter (`epic: null`).
- [ ] `PLAN-{feature-slug}.md` drafted with 6-state tasks and internal execution waves.
- [ ] Standalone feature visible in the AICO WebUI Feature Hub with `[Standalone]` badge.
