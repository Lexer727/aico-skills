---
name: aico-spec-migration
description: "Audit, normalize, and upgrade existing AICO Spec-Driven Development (SDD) repositories to target version 0.1.2. Enforces ec- epic naming, ft- feature naming, frontmatter order attributes, relative links, and vertical tracer-bullet DAG task execution."
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
id: <artifact-id>
type: <spec|plan|brainstorm|deep_dive|adr>
aico_version: "0.1.2"
epic: "ec-<short_id>" # or null for standalone features / system ADRs
order: 1              # Integer sequence for UI and roadmap sorting
title: "<Title>"
status: <Draft|Pending|In Progress|Completed>
derives_from: [<Upstream IDs>]
created_at: "<ISO-8601 Timestamp>"
---
```

### Rule 2: Directory & Naming Grammar (No Numeric Folder Prefixes)
- **Epics**: `epics/ec-{short_id}/` (e.g. `epics/ec-core/`, `epics/ec-specs/`).
- **Epic Brainstorm**: `brain-ec-{short_id}.md`.
- **Epic Features Directory**: `epics/ec-{short_id}/features/` (renamed from `specs/`).
- **Child Feature Directory**: `features/ft-{short_id}-{feature_suffix}/` (e.g. `features/ft-core-host-runtime/`).
- **Standalone Features**: Top-level `<specs-root>/features/ft-{feature_slug}/` (e.g. `features/ft-fast-trace/`).
- **Artifact Files**:
  - `spec-ft-{feature_slug}.md`
  - `plan-ft-{feature_slug}.md`
  - `brain-ft-{feature_slug}.md` (optional)
  - `dive-ft-{feature_slug}.md` (optional)

### Rule 3: Strict Relative Linking
All markdown links pointing to internal artifacts, specs, plans, code files, or ADRs must use relative paths (e.g., `../../adr/0001-host-runtime-and-network-topology.md`).
- ❌ **Forbidden**: `file:///d:/...` or absolute workspace paths.
- ✅ **Required**: Portable relative paths navigable in any Git viewer or IDE.

### Rule 4: Single Source of Truth (Zero Duplicated Body Metadata)
Never repeat fields defined in the frontmatter (`ID`, `Status`, `Derives From`, `Title`) under the top `# Title` heading.

### Rule 5: Vertical Tracer-Bullet Tasks in DAG
Implementation plan tasks replace simple checkboxes with explicit status fields, deliverables, test seams, and DAG dependencies:
```markdown
- **TASK-{prefix}-{suffix}-{seq}**: {Title}
  - **Status**: Done # Pending | In Progress | Done | Blocked | Skipped/Canceled | Rewritten
  - **Addresses**: `REQ-001`
  - **Blocked by**: None
  - **What it delivers**:
    - Deliverable item 1
    - Deliverable item 2
  - **Verification Seam**: `crates/module::test_function`
```

### Rule 6: Lowercase Everywhere
Epic IDs, feature slugs, filenames, and YAML frontmatter identifiers must be strictly lowercase (e.g., `ec-core`, `ft-fast-trace`, `spec-ft-fast-trace`).

---

## 2. Migration Execution Sequence

### Phase 1: Directory Renaming
1. Rename any `epics/001-*` to `epics/ec-<short_id>/`.
2. Rename `epics/ec-<short_id>/specs/` to `epics/ec-<short_id>/features/`.
3. Add `ft-` prefix to feature directories: `features/ft-<name>/`.
4. Rename files: `spec-ft-<name>.md`, `plan-ft-<name>.md`, `brain-ft-<name>.md`.

### Phase 2: Frontmatter Ingestion & Normalization
1. Insert line-1 YAML frontmatter with `id`, `type`, `aico_version: "0.1.2"`, `epic`, `order`, `title`, `status`, `derives_from`, `created_at`.
2. Remove redundant metadata blocks from markdown bodies.

### Phase 3: Path & Relative Link Audit
1. Normalize absolute or broken links to portable relative links.
2. Verify all references point to valid paths under the new directory scheme.

### Phase 4: Task Plan DAG Structuring
1. Transform flat or horizontal phase tasks into vertical tracer-bullet tasks.
2. Establish explicit dependency graph (`blocked_by`).

### Phase 5: Verification & Integrity Check
Run test suites and confirm frontend loads all epics and features seamlessly.
