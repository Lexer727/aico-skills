---
name: aico-spec-migration
description: "Audit, normalize, and upgrade existing AICO Spec-Driven Development (SDD) repositories to target version 0.1.2. Enforces EC- epic naming, top-level and child features directories, frontmatter order attributes, relative links, and wave-internal task execution."
disable-model-invocation: false
---

# AICO Spec Migration: Repository & Artifact Modernization (v0.1.2)

Upgrade legacy AICO specifications, plans, brainstorms, and architecture decision records (ADRs) to the canonical **0.1.2 Blueprint Standard** established in `ADR-0010`.

Use `/aico-spec-migration` when upgrading a specs repository or auditing an existing codebase for SDD v0.1.2 compliance.

---

## 1. Target 0.1.2 Blueprint Rules

Every migrated artifact must comply with these 6 mandatory rules:

### Rule 1: Universal Line-1 YAML Frontmatter with Decoupled Ordering
Every artifact file must start with a valid YAML frontmatter block on line 1:
```yaml
---
id: <ARTIFACT-ID>
type: <spec|plan|brainstorm|deep_dive|adr>
aico_version: "0.1.2"
epic: "EC-<short_id>" # or null for standalone features / system ADRs
order: 1              # Integer sequence for UI and roadmap sorting
title: "<Title>"
status: <Draft|Pending|In Progress|Completed>
derives_from: [<Upstream IDs>]
created_at: "<ISO-8601 Timestamp>"
---
```

### Rule 2: Directory & Naming Grammar (No Numeric Folder Prefixes)
- **Epics**: `epics/EC-{short_id}/` (e.g. `epics/EC-core/`, `epics/EC-specs/`).
- **Epic Brainstorm**: `BRAIN-EC-{short_id}.md`.
- **Epic Features Directory**: `epics/EC-{short_id}/features/` (renamed from `specs/`).
- **Child Feature Directory**: `features/{short_id}-{feature_suffix}/` (e.g. `features/core-host-runtime/`).
- **Standalone Features**: Top-level `<specs-root>/features/{feature_slug}/` (e.g. `features/export-pdf/`).
- **Artifact Files**:
  - `SPEC-{short_id}-{feature_suffix}.md` (or `SPEC-{feature_slug}.md`)
  - `PLAN-{short_id}-{feature_suffix}.md` (or `PLAN-{feature_slug}.md`)

### Rule 3: Strict Relative Linking
All markdown links pointing to internal artifacts, specs, plans, code files, or ADRs must use relative paths (e.g., `../../adr/0001-host-runtime-and-network-topology.md`).
- ❌ **Forbidden**: `file:///d:/...` or absolute workspace paths.
- ✅ **Required**: Portable relative paths navigable in any Git viewer or IDE.

### Rule 4: Single Source of Truth (Zero Duplicated Body Metadata)
Never repeat fields defined in the frontmatter (`ID`, `Status`, `Derives From`, `Title`) under the top `# Title` heading.

### Rule 5: 6-State Task Tracking with Wave-Internal Execution
Implementation plan tasks replace simple checkboxes with explicit status fields and define internal execution waves:
```markdown
- **TASK-{prefix}-{suffix}-{seq}**: {Title}
  - **Status**: Done # Pending | In Progress | Done | Blocked | Skipped/Canceled | Rewritten
  - **Addresses**: `REQ-001`
  - **Blocked by**: None
  - **Execution Waves**:
    - **Wave 1 (Scaffolding)**: Red interface contracts and failing seam tests (@verifies REQ-001).
    - **Wave 2 (Implementation)**: Minimal green code (@implements REQ-001).
    - **Wave 3 (Verification)**: Error handling, edge cases, and contract hardening.
  - **Verification Seam**: `crate::module::seam_test`
```

### Rule 6: Non-Destructive Mutations & Audit Trail
If a task was canceled or rewritten during evolution:
- Never delete the original task.
- Set `- **Status**: Skipped/Canceled` or `- **Status**: Rewritten`.
- Append mandatory `- **Reason**: <Why>` and `- **Rewrite Target**: <TASK-ID>`.

---

## 2. Automated Migration Procedure

### Phase 1: Directory Renaming
1. Rename epic containers: `epics/001-aico-core` $\to$ `epics/EC-core`, `epics/002-aico-specs` $\to$ `epics/EC-specs`.
2. Inside each epic, rename `specs/` $\to$ `features/`.
3. Create top-level `<specs-root>/features/` for standalone features.
4. Rename child feature directories: e.g. `01-host-runtime` $\to$ `core-host-runtime`.

### Phase 2: File Renaming & Frontmatter Normalization
1. Rename brainstorm files: e.g. `BRAIN-001-aico-core.md` $\to$ `BRAIN-EC-core.md`.
2. Rename spec and plan files: e.g. `SPEC-CORE-001.md` $\to$ `SPEC-core-host-runtime.md`, `PLAN-CORE-001.md` $\to$ `PLAN-core-host-runtime.md`.
3. Inject `order: <number>` and `aico_version: "0.1.2"` into frontmatter.
4. Set `epic: "EC-{short_id}"` for epic features and `epic: null` for standalone features.

### Phase 3: Link Audit & Seam Verification
1. Audit all relative links across migrated documents.
2. Confirm all test seams are registered in code with `@verifies` annotations.
