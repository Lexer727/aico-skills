---
name: aico-verify
description: "Verify that generated SDD artifacts strictly adhere to canonical skill templates and accurately cover codebase implementation ground truth."
disable-model-invocation: false
---

# AICO Verify: Dual-Axis Artifact & Ground-Truth Parity Audit

The verification engine and quality gate for Spec-Driven Development (SDD). `aico-verify` provides adversarial, bidirectional verification that answers two foundational questions:
1. **Axis 1 (Blueprint & Template Conformance)**: Do generated epics, features, specs, plans, and ADRs strictly conform to canonical skill templates and the SDD v0.1.2 schema?
2. **Axis 2 (Codebase Parity & Seam Ground Truth)**: Does the specification accurately reflect what is implemented in the codebase, and do declared verification seams physically exist, pass tests, and satisfy in-band contracts without dark code or phantom deliverables?

Use `/aico-verify` before merging, before closing milestones, after running migrations, or when auditing brownfield/greenfield SDD repositories.

---

## 1. Why Dual-Axis Verification?

Traditional linters only inspect syntax, and traditional test runners only execute test files. Neither catches the semantic drift between what a specification promised and what a developer or agent actually committed:
- **Spec Drift**: A task is marked `Status: Done`, but the files listed under `What it delivers` were never committed, or the test seam does not exist on disk (**Phantom Deliverables**).
- **Dark Code / Scope Creep**: Production code introduces public API routes, background workers, or complex UI components that have zero corresponding requirements or tests.
- **Template Decay**: Artifacts omit required YAML frontmatter fields, use broken absolute paths, reintroduce static Active Frontier sections, or duplicate amendment headers.

Running both axes simultaneously guarantees that documentation and codebase ground truth remain in 100% mathematical lockstep.

```
       ┌────────────────────────────────────────────────────────┐
       │                      /aico-verify                      │
       └───────────────────────────┬────────────────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        [Axis 1: Blueprint]                 [Axis 2: Ground Truth]
     - Line-1 YAML Frontmatter           - In-band Traceability Tags
     - Strict Relative Links               (@implements / @verifies)
     - Lowercase Naming Grammar          - Test Seams Exist on Disk
     - Strict EARS Grammar (shall)       - Deliverables Parity (Done)
     - Dynamic Frontier Cleanliness      - Dark Code & Scope Creep
     - Single Amendment Header           - Status & Lifecycle Sync
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   ▼
                      [Dual-Axis Audit Report]
                     (Pass / Warn / Action Plan)
```

---

## 2. Verification Rules & Standards

### Axis 1: Artifact Blueprint & Template Conformance

Every artifact in the specs repository (`epics/`, `features/`, `adr/`, `specs/`, `plans/`) must strictly comply with the canonical v0.1.2 rules established in `ADR-0010`:

1. **Rule 1: Line-1 YAML Frontmatter**:
   - The document MUST begin on Line 1 with `---` (zero preceding blank lines, whitespace, or comments).
   - Mandatory fields:
     ```yaml
     ---
     id: <artifact-id>               # Lowercase canonical ID (e.g., spec-ft-fast-trace, plan-ft-fast-trace, ec-core)
     type: <type>                    # spec | plan | brainstorm | deep_dive | adr
     aico_skills_version: "0.1.2"    # Governed by aico-skills/VERSION (legacy aico_version accepted)
     epic: <"ec-<id>" | null>        # Enclosing epic container or null
     order: <integer>         # Non-negative sequence integer (required for specs, plans, features)
     title: "<Document Title>"
     status: <Status>         # Draft | Pending | In Progress | Completed (or Accepted/Proposed for ADR)
     derives_from: [...]      # Upstream dependencies (e.g. ["ADR-0001"])
     created_at: "<ISO-8601>" # Valid UTC ISO timestamp
     ---
     ```
2. **Rule 2: Single Source of Truth (No Duplicate Body Metadata)**:
   - Body markdown must NEVER repeat metadata defined in frontmatter (`**Status**: ...`, `**ID**: ...`, `**Derives From**: ...`) under the top `# Title` heading.
3. **Rule 3: Strict Portable Relative Linking**:
   - All markdown links pointing to internal specs, ADRs, or files must use relative paths (e.g., `../../../../adr/0004-react-frontend-and-reusable-design-system.md`).
   - ❌ **Forbidden**: Absolute local paths (`file:///...`, `D:\...`, `C:\...`).
   - Target files referenced by links must physically exist on disk (zero dead links).
4. **Rule 4: Lowercase Directory & File Naming Grammar**:
   - Epic directories: `epics/ec-{short_id}/` (e.g. `epics/ec-core/`).
   - Feature directories: `features/ft-{slug}/` (e.g. `features/ft-fast-trace/`).
   - Filenames: `spec-ft-{slug}.md`, `plan-ft-{slug}.md`, `brain-ec-{slug}.md`, `dive-ft-{slug}.md`.
   - Zero numeric directory prefixes (`001-*`) or legacy folder names (`specs/`).
5. **Rule 5: Strict EARS Grammar & Scope Boundaries**:
   - Feature specifications must contain explicit `## In-Scope` and `## Out-of-Scope` boundaries.
   - Requirements must follow one of the 5 canonical EARS patterns and strictly utilize the modal verb **"shall"** (never "should", "may", "can", or "will").
   - Specifications must declare `## 4. Designated Public Test Seams` identifying public interface boundaries.
6. **Rule 6: Vertical Tracer-Bullet Tasks in Directed Acyclic Graph (DAG)**:
   - Plan tasks must adhere to structured vertical schema:
     ```markdown
     - **TASK-{prefix}-{seq}**: {Title}
       - **Status**: Done # Pending | In Progress | Done | Blocked | Skipped/Canceled | Rewritten
       - **Addresses**: `REQ-###`
       - **Blocked by**: None | TASK-###
       - **What it delivers**:
         - Concrete deliverable item 1
       - **Verification Seam**: `path/to/test.rs::test_function`
     ```
   - Canceled or rewritten tasks must declare mandatory `- **Reason**:` and `- **Rewrite Target**:`.
   - Dependency references in `Blocked by` must resolve to real tasks without cyclic loops.
7. **Rule 7: Dynamic Frontier Cleanliness & Single Amendment Header**:
   - Plans must NEVER contain a static `## Active Frontier` or `## Initial Active Frontier` section. The frontier is evaluated dynamically from `Status` and `Blocked by`.
   - Any plan amendments must be consolidated under a single `## 3. Amendment Log` heading with zero duplicate headers.

---

### Axis 2: Codebase Ground-Truth Coverage & Seam Parity

Specifications and plans must not be aspirational fiction. Codebase verification audits actual implementation state on disk:

1. **Rule 8: In-Band Traceability Tagging Parity**:
   - Every `REQ-###` declared in an active feature specification must be implemented by at least one production code symbol annotated with:
     ```typescript
     // @implements spec-ft-<slug>::REQ-###
     ```
     (or Python `# @implements ...`, Rust `// @implements ...`).
   - Every `REQ-###` must be covered by at least one test annotated with:
     ```typescript
     // @verifies spec-ft-<slug>::REQ-###
     ```
   - **Orphan Tag Detection**: Any `@implements` or `@verifies` tag referencing a non-existent specification or requirement ID is flagged as an error.
2. **Rule 9: Physical Seam Existence on Disk**:
   - Every `Verification Seam` declared in plan tasks and specifications must point to a file that physically exists in the codebase.
   - If a seam is declared as `tests/my_test.rs` but the file resides under a sub-crate (e.g. `crates/my-crate/tests/my_test.rs`), the auditor reports the missing prefix and recommends the corrected path.
   - The test function or suite at that seam must compile and pass cleanly when executed.
3. **Rule 10: Deliverables Ground-Truth Parity for "Done" Tasks**:
   - If a task is marked `- **Status**: Done`, the auditor inspects the codebase to ensure all bullet items under `What it delivers` are actually implemented.
   - Prematurely marking a task `Done` when the underlying files, methods, or UI views are missing is flagged as **Premature Completion / Phantom Deliverable**.
4. **Rule 11: Dark Code & Scope Creep Detection**:
   - Public APIs, HTTP routes, CLI subcommands, or exported components added without corresponding requirements or tasks are flagged as uncontracted dark code.
5. **Rule 12: Status Consistency & Lifecycle Alignment**:
   - If a plan frontmatter indicates `status: "Completed"`, 100% of its child tasks must be `Done`, `Skipped/Canceled`, or `Rewritten`. Any `Pending` or `In Progress` task in a "Completed" plan constitutes a hard status contradiction.
   - If a task is marked `Done`, all upstream prerequisites declared in `Blocked by` must also be `Done`.

---

## 3. Automated Verification Script

A high-performance automated verification script is bundled directly with this skill:

```bash
node <skills-path>/aico-verify/scripts/verify-artifacts.mjs <specs-dir> [codebase-dir] [options]
```

### Options:
- `--verbose`: Displays detailed unverified requirement IDs and trace mappings.
- `--fix`: Automatically repairs safe blueprint issues (e.g. normalizing `aico_version` to `aico_skills_version: "0.1.2"`, resolving relative ADR linking depths).
- `--json`: Emits complete machine-readable verification JSON for CI/CD or agent ingestion.

### Example Invocations:
```bash
# Verify specs directory only (Axis 1)
node ~/.gemini/config/plugins/aico-skills/skills/aico-verify/scripts/verify-artifacts.mjs d:/aico/aico-specs

# Full dual-axis verification (Axis 1 + Axis 2)
node ~/.gemini/config/plugins/aico-skills/skills/aico-verify/scripts/verify-artifacts.mjs d:/aico/aico-specs d:/dev/aico

# Auto-fix safe schema versioning and broken ADR relative paths
node ~/.gemini/config/plugins/aico-skills/skills/aico-verify/scripts/verify-artifacts.mjs d:/aico/aico-specs d:/dev/aico --fix
```

---

## 4. Verification Execution Procedure

When invoked as an agent skill (`/aico-verify`), follow this standard operating procedure:

### Phase 1: Environment & Path Discovery
1. Identify the target specs directory (e.g. `<project>-specs` or `epics/`) and codebase root directory.
2. If verifying a single feature or epic, locate its corresponding `spec-*.md`, `plan-*.md`, and source modules.

### Phase 2: Run Automated Audit Engine
Execute the bundled `verify-artifacts.mjs` script across the target directories:
```powershell
node ~/.gemini/config/plugins/aico-skills/skills/aico-verify/scripts/verify-artifacts.mjs <specs-path> <code-path>
```
Inspect the output summary:
- Total artifacts scanned vs valid
- Blueprint errors and warnings (Axis 1)
- Missing seam files and mislocated seam paths (Axis 2)
- Status contradictions (e.g. "Completed" plan with pending tasks)
- Requirements coverage (implemented % and verified %)

### Phase 3: Seam Ground-Truth & Test Runner Execution
1. For any test seams exercising active or completed tasks, execute the corresponding test runner:
   - Rust: `cargo test --test <seam_file>`
   - TypeScript/React: `pnpm test <seam_file>` or `npm test`
   - Python: `pytest <seam_file>`
2. Confirm that all executed tests run **GREEN** without regressions.

### Phase 4: Deliverables Parity Check
Sample tasks marked `Done` in `plan-*.md`:
- Check that files listed under `What it delivers` exist on disk.
- Check that expected public symbols are exported and annotated with `@implements`.
- Flag any tasks that were marked `Done` prematurely.

### Phase 5: Synthesis & Verification Report
Present the verification findings using the standardized report format:

```markdown
# AICO Dual-Axis Verification Report

## 1. Executive Summary
- **Specs Directory**: `<specs-path>`
- **Codebase Directory**: `<codebase-path>`
- **Overall Verdict**: [PASSED | ACTION REQUIRED]
- **Blueprint Conformance**: X/Y Artifacts Valid (E Errors, W Warnings)
- **Traceability Coverage**: Implemented: A/B (X%), Verified: C/B (Y%)
- **Seams Ground-Truth**: V Valid, M Missing, P Mislocated

## 2. Blueprint Conformance Findings (Axis 1)
| Artifact | Type | Status | Findings | Remediation |
| :--- | :--- | :--- | :--- | :--- |
| `spec-ft-example.md` | spec | Completed | Broken relative link to ADR-0004 | Update relative link depth |

## 3. Ground-Truth Seam & Parity Findings (Axis 2)
| Task ID | Declared Seam | Status on Disk | Remediation |
| :--- | :--- | :--- | :--- |
| `TASK-001` | `tests/foo_test.rs` | Mislocated at `crates/foo/tests/foo_test.rs` | Update seam path in plan |

## 4. In-Band Contract Traceability Matrix
- **spec-ft-example**: 12/12 Implemented (100%), 12/12 Verified (100%) [PASS]
- **spec-ft-sample**: 8/10 Implemented, 6/10 Verified [WARN: Missing REQ-009, REQ-010]

## 5. Actionable Remediation Plan
1. [ ] Run `verify-artifacts.mjs --fix` to auto-bump schema versions.
2. [ ] Route to `/aico-plan-amendment` to update mislocated seam paths.
3. [ ] Route to `/aico-test-scaffolding` to scaffold tests for unverified requirements.
```

---

## 5. Remediation Routing

Depending on the audit verdict, route directly to the appropriate specialized skill:

| Finding | Root Cause | Target Skill |
| :--- | :--- | :--- |
| **Blueprint Schema Errors** | Legacy frontmatter, absolute links, duplicate body metadata | **`/aico-spec-migration`** |
| **Static Frontier in Plan** | Obsolete `## 3. Active Frontier` header | **`/aico-plan-amendment`** |
| **Mislocated Seam Paths** | Workspace crate path missing from plan seam declaration | **`/aico-plan-amendment`** |
| **Unverified Requirements** | Requirements missing `@verifies` tests | **`/aico-test-scaffolding`** |
| **Unimplemented Requirements** | Requirements missing `@implements` code | **`/aico-implementation`** |
| **Status Contradictions** | Plan marked Completed while tasks are Pending | **`/aico-plan-amendment`** |
| **Dark Code / Scope Creep** | Uncontracted public endpoints or modules | **`/aico-spec-creation`** |

---

## Completion Criteria
- [ ] Both Axis 1 (Blueprint Conformance) and Axis 2 (Ground-Truth Parity) audited.
- [ ] Frontmatter on Line 1, v0.1.2 schema, relative links, and dynamic frontier verified.
- [ ] All declared test seams checked against actual disk contents.
- [ ] In-band `@implements` and `@verifies` annotations cross-referenced against declared requirements.
- [ ] Structured Verification Report emitted with clear PASS or ACTION REQUIRED verdict and actionable next steps.
