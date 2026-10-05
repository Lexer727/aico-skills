---
name: aico-spec-migration
description: "Audit, normalize, and upgrade existing AICO Spec-Driven Development (SDD) repositories to target version 0.1.1. Enforces universal YAML frontmatter, converts absolute file:/// links to relative paths, removes duplicate body metadata, and transforms task graphs to 6-state tracking."
disable-model-invocation: false
---

# AICO Spec Migration: Repository & Artifact Modernization

Upgrade legacy AICO specifications, plans, brainstorms, and architecture decision records (ADRs) to the canonical **0.1.1 Blueprint Standard**.

Use `/aico-spec-migration` when bumping a specs repository to a new AICO version or auditing an existing codebase for SDD compliance.

---

## 1. Target 0.1.1 Blueprint Rules

Every migrated artifact must comply with these 5 mandatory rules:

### Rule 1: Universal Line-1 YAML Frontmatter
Every artifact file must start with a valid YAML frontmatter block on line 1:
```yaml
---
id: <ARTIFACT-ID>
type: <spec|plan|brainstorm|deep_dive|adr>
aico_version: "0.1.1"
epic: "<epic-slug>" # Optional for system-wide ADRs
title: "<Title>"
status: <Draft|Pending|In Progress|Completed>
derives_from: [<Upstream IDs>]
created_at: "<ISO-8601 Timestamp>"
---
```

### Rule 2: Strict Relative Linking
All markdown links pointing to internal artifacts, specs, plans, code files, or ADRs must use relative paths (e.g., `../../adr/0001-host-runtime-and-network-topology.md`).
- ❌ **Forbidden**: `file:///d:/...` or absolute workspace paths.
- ✅ **Required**: Portable relative paths navigable in any Git viewer or IDE.

### Rule 3: Single Source of Truth (Zero Duplicated Body Metadata)
Never repeat fields defined in the frontmatter (`ID`, `Status`, `Derives From`, `Title`) under the top `# Title` heading.
- Remove redundant `- **ID**: ...`, `- **Status**: ...`, `- **Derives From**: ...` lists.
- Move domain-specific attributes (like `Domain: core-runtime`) into appropriate introductory sections or domain tags.

### Rule 4: Standardized 4-State Artifact Lifecycle
- `Draft`: Initial drafting or exploratory brainstorming.
- `Pending`: Approved and queued for implementation.
- `In Progress`: Actively being coded and tested.
- `Completed`: All requirements verified with green seam tests.

### Rule 5: 6-State Task Tracking with Audit Trails
Implementation plan tasks replace simple checkboxes (`- [x]`) with explicit status fields:
```markdown
- **TASK-001**: {Title}
  - **Status**: Done # Pending | In Progress | Done | Blocked | Skipped/Canceled | Rewritten
  - **Addresses**: REQ-001
  - **Blocked by**: None
  - **What it delivers**: ...
```
If a task was canceled or rewritten during evolution:
- Never delete the original task.
- Append mandatory `- **Reason**: ...` and `- **Rewrite Target**: ...`.

---

## 2. Migration Workflow

```
Inventory Artifacts ───> Migrate ADRs ───> Migrate Brainstorms ───> Migrate Specs ───> Migrate Plans ───> Audit
```

### Step 1: Inventory Repository
Scan `<project>-specs/` recursively for all `.md` files across:
- `adr/`
- `epics/<epic-slug>/`
- `epics/<epic-slug>/specs/<spec-slug>/`

### Step 2: Migrate ADRs (`adr/*.md`)
1. Prepend YAML frontmatter with `type: adr`, `aico_version: "0.1.1"`, and appropriate status (`Completed` for historical accepted ADRs).
2. Remove redundant header lists (`- **Status**: accepted`, `- **Date**: ...`) from the body.
3. Replace any absolute `file:///` URLs with relative markdown links.

### Step 3: Migrate Brainstorms (`BRAIN-*.md`)
1. Prepend YAML frontmatter with `type: brainstorm`, `aico_version: "0.1.1"`.
2. Set `status: Completed` for ratified epics.
3. Remove redundant metadata lines.

### Step 4: Migrate Specifications (`SPEC-*.md`)
1. Ensure YAML frontmatter is present at line 1.
2. Bump `aico_version: "0.1.1"`.
3. Update `status: Completed` if all requirements are implemented and verified.
4. Remove redundant `- **ID**: ...`, `- **Status**: ...`, `- **Derives From**: ...` metadata lines directly beneath the `# Title` heading.
5. Convert all `derives_from` and in-body links to relative paths.

### Step 5: Migrate Implementation Plans (`PLAN-*.md`)
1. Prepend YAML frontmatter with `type: plan`, `aico_version: "0.1.1"`, `status: Completed` (or active status).
2. Remove redundant `- **ID**: ...`, `- **Spec Reference**: ...`, `- **Status**: ...` lines from the body.
3. Convert all `- [x] **TASK-***` lines to:
   ```markdown
   - **TASK-***: {Title}
     - **Status**: Done
   ```
4. Convert all `- [ ] **TASK-***` lines to `Status: Pending` or `Status: Blocked`.
5. Convert all cross-spec references to relative markdown links.

### Step 6: Verification & Link Audit
Run link and schema validation:
- Confirm zero occurrences of `file:///`.
- Confirm 100% of `.md` artifacts contain line-1 YAML frontmatter with `aico_version: "0.1.1"`.
- Confirm no duplicate `ID` / `Status` / `Derives From` blocks exist in document bodies.
- Verify workspace builds and tests still run cleanly.

---

## Completion Criteria
- [ ] All ADRs updated with frontmatter and relative links.
- [ ] All Epic brainstorms updated.
- [ ] All specifications updated to 0.1.1 schema with zero duplicated body metadata.
- [ ] All implementation plans upgraded with 6-state task tracking.
- [ ] Linking audit passes with 0 absolute `file:///` URLs.
- [ ] Repository committed with clear migration message.
