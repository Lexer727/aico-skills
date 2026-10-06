---
name: aico-feature
description: "Universal atomic engine for feature scaffolding, specification, and execution (both standalone features and child features inside epics). Enforces ft- naming, optional epic container binding, EARS specifications, and vertical tracer-bullet task DAG planning with flexible internal execution waves."
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
   - `aico_version`: `"0.1.2"`
   - `epic`: `"ec-<short_id>"` (if child feature) or `null` (if standalone)
   - `order`: `<integer>` (governs visual sort sequence)
   - `title`: Human-readable capability title
   - `status`: `Draft` | `Pending` | `In Progress` | `Completed`
   - `derives_from`: List of derived ADR IDs, Brainstorm IDs, or parent Epic IDs
   - `created_at`: ISO 8601 UTC timestamp
5. **Vertical Tracer-Bullet Tasks with Flexible Internal Waves**: Implementation tasks within `plan-ft-<feature_slug>.md` represent vertical slices. Inside each task, execution is broken down into flexible execution waves chosen from:
   - **Wave 1 (Scaffolding)**: Red interface contracts and failing seam tests (`@verifies REQ-###`).
   - **Wave 2 (Implementation)**: Minimal green code turning seam tests green (`@implements REQ-###`).
   - **Wave 3 (Verification)**: Error edge cases, security invariants, benchmarks, and contract hardening.
   - **Wave 4 (Integration / Human Gate)**: End-to-end integration, UI wiring, and user verification.
   *Note: Waves are optional per task; a task only declares the waves it actually requires.*

---

## 2. Invocation Context & Parameters

When invoked, `aico-feature` accepts:
- **`slug`**: The feature identifier (e.g. `fast-trace` or `core-discovery`). The tool ensures the `ft-` prefix (`ft-<slug>`).
- **`epic`** *(optional)*: Parent epic identifier (e.g. `ec-core`). If omitted or `null`, the feature is treated as standalone.
- **`target_dir`** *(optional)*: Override target directory path. Defaults to `<specs-root>/features/ft-<slug>/` for standalone, or `<specs-root>/epics/ec-<epic>/features/ft-<slug>/` for epic children.
- **`derives_from`** *(optional)*: List of parent documents (e.g. `["brain-ec-core"]`).

---

## 3. Process

```
/aico-feature (Atomic Engine)
       │
       ├── 1. Resolve Path: features/ft-<slug>/ OR epics/ec-<id>/features/ft-<slug>/
       │
       ├── 2. /aico-deep-dive (Analyze subsystem boundaries, blast radius & test seams)
       │
       ├── 3. /aico-spec-creation (Draft spec-ft-<slug>.md with EARS requirements)
       │
       ├── 4. /aico-planning (Draft plan-ft-<slug>.md with vertical tasks & flexible waves)
       │
       └── 5. Delivery Execution:
              - /aico-test-scaffolding (Wave 1: Red tests @verifies)
              - /aico-implementation    (Wave 2: Green domain code @implements)
              - Hardening & Review     (Wave 3 & Wave 4)
```

### Step 1: Scaffold Feature Container
Create target directory:
- Standalone: `<specs-root>/features/ft-<feature_slug>/`
- Epic Child: `<specs-root>/epics/ec-<short_id>/features/ft-<feature_slug>/`

### Step 2: System Boundary & Blast Radius Analysis
Invoke **`/aico-deep-dive`**:
- Identify touched crates, modules, and public exports.
- Designate primary and secondary test seams.
- (Optional) Save `dive-ft-<feature_slug>.md` if non-trivial architectural boundaries exist.

### Step 3: Draft Formal EARS Specification
Invoke **`/aico-spec-creation`**:
- Write `spec-ft-<feature_slug>.md` with frontmatter:
  ```yaml
  ---
  id: spec-ft-<feature_slug>
  type: spec
  aico_version: "0.1.2"
  epic: <"ec-id" | null>
  order: 1
  title: "<Feature Title>"
  status: Draft
  derives_from: [<"brain-ec-id" | ADR>]
  created_at: "YYYY-MM-DDTHH:MM:SSZ"
  ---
  ```
- Formulate testable EARS requirements (`REQ-001..`) conforming strictly to canonical grammar patterns.
- Designate public test seams in code.

### Step 4: Decompose into Task Plan DAG
Invoke **`/aico-planning`**:
- Write `plan-ft-<feature_slug>.md` with frontmatter:
  ```yaml
  ---
  id: plan-ft-<feature_slug>
  type: plan
  aico_version: "0.1.2"
  epic: <"ec-id" | null>
  order: 1
  title: "<Feature Title> Implementation Plan"
  status: Draft
  derives_from: ["spec-ft-<feature_slug>"]
  created_at: "YYYY-MM-DDTHH:MM:SSZ"
  ---
  ```
- Structure tasks into vertical tracer bullets with flexible internal execution waves (Wave 1, 2, 3, and/or 4).

### Step 5: Test Scaffolding & Implementation
1. Invoke **`/aico-test-scaffolding`** to write failing contract tests (`Wave 1`).
2. Invoke **`/aico-implementation`** to write green code (`Wave 2`).
3. Complete verification/hardening (`Wave 3`) and human gates (`Wave 4`) if declared.
4. Run `/aico-review-loop` and update frontmatter status to `Completed`.

---

## Completion Criteria
- [ ] Feature directory created with `ft-` prefix (`features/ft-<slug>/` or `epics/ec-<id>/features/ft-<slug>/`).
- [ ] Deep dive blast radius analyzed and seams designated.
- [ ] `spec-ft-<slug>.md` drafted with canonical frontmatter (`epic: "ec-<id>"` or `null`).
- [ ] `plan-ft-<slug>.md` drafted with vertical tasks declaring flexible internal execution waves.
- [ ] Visible in the AICO WebUI (Epic Hub or Standalone Feature Hub).
