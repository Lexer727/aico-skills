# AICO Verification Checklist & Audit Rubric

A quick-reference checklist for auditing AICO artifacts and codebase ground-truth compliance.

---

## 1. Axis 1: Artifact Blueprint & Template Conformance

### Line-1 Frontmatter & Schema
- [ ] **Line 1 Start**: File begins strictly with `---` on Line 1. No preceding blank lines or comments.
- [ ] **Canonical ID**: Lowercase identifier matching prefix convention:
  - Epic: `ec-<slug>`
  - Feature Spec: `spec-ft-<slug>`
  - Feature Plan: `plan-ft-<slug>`
  - Brainstorm: `brain-ec-<slug>` or `brain-ft-<slug>`
  - Deep Dive: `dive-ft-<slug>`
  - ADR: `adr-<####>`
- [ ] **Mandatory Fields**: `id`, `type`, `aico_skills_version` (governed by `aico-skills/VERSION`), `title`, `status`, `created_at`.
- [ ] **Version**: `aico_skills_version` strictly matches the version string in `aico-skills/VERSION`.
- [ ] **Order Attribute**: `order: <integer>` present on all specs, plans, and features.
- [ ] **Valid Status**: One of `Draft`, `Pending`, `In Progress`, `Completed` (or `Accepted`, `Proposed`, `Rejected`, `Superseded` for ADRs).

### Single Source of Truth
- [ ] **No Body Duplication**: Body markdown does not repeat `**Status**:`, `**ID**:`, `**Version**:`, or `**Derives From**:` under `# Title`.

### Pathing & Relative Links
- [ ] **Strict Relative Links**: Every markdown link uses portable relative syntax (`../../...`).
- [ ] **Zero Absolute Paths**: No `file:///`, `C:\`, `D:\`, or root-relative paths.
- [ ] **No Dead Links**: Every link target resolves to an existing file on disk.

### EARS Specifications
- [ ] **Scope Boundaries**: Explicit `## In-Scope` and `## Out-of-Scope` sections present.
- [ ] **EARS Grammar**: Every requirement uses one of the 5 patterns with modal verb **"shall"**.
- [ ] **Public Test Seams**: `## 4. Designated Public Test Seams` section defines public interface seams.

### Plan Task DAG & Frontier Cleanliness
- [ ] **Vertical Format**: Every task declares `Status`, `Addresses`, `Blocked by`, `What it delivers`, and `Verification Seam`.
- [ ] **Non-destructive Mutations**: Canceled/rewritten tasks include mandatory `Reason` and `Rewrite Target`.
- [ ] **No Static Frontier**: Zero `## Active Frontier` or `## Initial Active Frontier` sections in markdown.
- [ ] **Single Amendment Log**: At most one `## 3. Amendment Log` section (no duplicate headers).

---

## 2. Axis 2: Codebase Ground-Truth & Seam Parity

### In-Band Traceability
- [ ] **`@implements` Coverage**: Every active `REQ-###` has at least one source symbol tagged with `// @implements spec-ft-<slug>::REQ-###`.
- [ ] **`@verifies` Coverage**: Every active `REQ-###` has at least one test tagged with `// @verifies spec-ft-<slug>::REQ-###`.
- [ ] **Zero Orphan Annotations**: No annotations reference non-existent specifications or invalid requirement IDs.

### Verification Seams Ground Truth
- [ ] **Physical Existence**: Every declared `Verification Seam` resolves to an existing file in the codebase.
- [ ] **Workspace Crate Resolution**: Rust workspace seams specify the correct crate prefix (e.g., `crates/aico-core/tests/...`).
- [ ] **Passing Tests**: The test suite at each seam compiles cleanly and turns **GREEN**.

### Deliverables & Lifecycle Consistency
- [ ] **Real Deliverables for "Done" Tasks**: Every deliverable item listed under `What it delivers` for a `Done` task physically exists in code.
- [ ] **No Phantom Completions**: No task is marked `Done` if code is unfinished or tests fail.
- [ ] **Plan Status Alignment**: If plan is `Completed`, 100% of tasks are `Done`, `Skipped/Canceled`, or `Rewritten`.
- [ ] **Dependency Alignment**: All tasks declared in `Blocked by` for a `Done` task are also marked `Done`.
- [ ] **Zero Dark Code**: Public routes, CLI commands, and UI views have corresponding specifications and task contracts.
