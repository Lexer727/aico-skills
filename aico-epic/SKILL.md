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
5. **Universal Line-1 YAML Frontmatter**: Every artifact (`brain-ec-*.md`, `spec-ft-*.md`, `plan-ft-*.md`) must include canonical frontmatter with `id`, `type`, `aico_skills_version: "{aico_skills_version}"` (read dynamically from the `aico-skills/plugin.json` file), `epic: "ec-{short_id}"`, `order: <number>`, `title`, `status`, `derives_from`, and `created_at`.
6. **Strict Relative Linking**: All cross-document links must use portable relative markdown paths (e.g. `../../adr/...`), never absolute `file:///` URLs.

---

## 2. Process

```
From /aico-start ───> /aico-epic ───> Scaffold Container ───> Draft brain-ec-<id>.md ───> Decompose Child Features
                     (Triage Match)    (epics/ec-<id>/)       (Overarching Concept)        (calls /aico-feature)
```

### Step 1: Scope & Scaffold the Epic Container via `aico-cli.mjs`
1. Resolve `<project>-specs/epics/ec-{short_id}/` using a concise, descriptive identifier (e.g. `ec-core`, `ec-specs`, `ec-tooling`).
2. Execute the deterministic CLI scaffolder to create `epics/ec-{short_id}/features/` and initialize `brain-ec-{short_id}.md` with canonical Line-1 YAML frontmatter:
   ```bash
   node <skills-path>/scripts/aico-cli.mjs scaffold-epic --specs-dir <project>-specs --id <short_id> --title "<Epic Title>" --derives-from "ADR-####"
   ```

### Step 2: Overarching Concept & Shared Brainstorm
1. Ingest problem statement, cross-cutting architectural trade-offs, and candidate alternatives gathered in `/aico-start`.
2. Populate the body sections of the scaffolded shared brainstorm artifact:
   `<project>-specs/epics/ec-{short_id}/brain-ec-{short_id}.md`
   ```yaml
   ---
   id: brain-ec-{short_id}
   type: brainstorm
   aico_skills_version: "{aico_skills_version}" # Injected automatically by aico-cli.mjs
   epic: "ec-{short_id}"
   title: "Epic Title"
   status: "Draft"
   derives_from: ["ADR-####"]
   created_at: "YYYY-MM-DDTHH:MM:SSZ"
   ---
   ```

### Step 3: Decompose into Child Features via `/aico-feature`
1. Break down the overarching initiative into cohesive child feature slugs:
   - `ft-{short_id}-{feature_1}`
   - `ft-{short_id}-{feature_2}`
2. For **each child feature**, invoke **`/aico-feature` (Phase 1: Scaffolding & Planning)** with:
   - `slug`: `ft-{short_id}-{feature_n}`
   - `epic`: `"ec-{short_id}"`
   - `target_dir`: `epics/ec-{short_id}/features/ft-{short_id}-{feature_n}/`
   - `derives_from`: `["brain-ec-{short_id}"]`
3. `/aico-feature` runs the deep-dive, drafts `spec-ft-*.md`, and constructs `plan-ft-*.md` with vertical tracer-bullet tasks in a DAG.

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

### Step 5: Human Review & Approval Gate (MANDATORY STOP)
> [!IMPORTANT]
> **Strict SDD Phase Boundary**: The framing and planning of an Epic concludes once `brain-ec-*.md` and all child `spec-ft-*.md` and `plan-ft-*.md` artifacts are created and verified.
> 
> - **MANDATORY STOP**: The agent MUST STOP execution here. Output `[AICO GATE: Waiting for Confirmation]` to clearly signal the review gate to the developer and terminal monitors. Present the scaffolded epic summary, child feature specifications, and task DAG frontiers to the developer, and invoke the interactive `ask_question` tool with structured choices (e.g. `(Recommended) Approve and proceed`, candidate architectural choices, `Cancel`).
> - **DO NOT proceed to implementation** (`/aico-test-scaffolding` or `/aico-implementation`) without explicit user review and instruction to begin execution.
> - Never bundle scaffolding and implementation into a single turn or confirmation question.

### Step 6: Cross-Feature Milestone Convergence & Execution
Only entered after the developer approves the plans and explicitly commands execution:
- Implement features via `/aico-test-scaffolding` (red tests) and `/aico-implementation` (green code).
- All child features have passing red-to-green seam tests across their task plans.
- Standards vs Spec two-axis review has passed (`/aico-review-loop`).
- All human gate tasks in the Plan DAG are satisfied.
- Frontmatter status for the epic brainstorm and all child specs/plans is updated to `Completed`.

---

## 3. Parallel Subagent Execution & Per-Task Model Routing (`invoke_subagent`)

In multi-feature epics, child features (`ft-*`) and their plan tasks frequently have independent, disjoint deliverables that can be developed concurrently:

### Ready Frontier Inspection across Epics
Inspect unblocked child features and active plan frontiers across the epic:
```bash
node <skills-path>/scripts/aico-cli.mjs frontier --specs-dir <specs-root> --epic ec-<id> --json
```
When two or more child features or tasks are unblocked, parallel execution can be coordinated.

### Seam Disjointness Check (REQ-004)
Before launching parallel child feature subagents, verify file and seam disjointness:
- **Disjoint Child Features**: Child features target different repositories, different directories, or completely independent modules/seams. These can proceed in parallel.
- **Overlapping Seams**: If two unblocked features touch shared crates, shared schemas, or common integration seams, the epic orchestrator **MUST serialize** their execution.

### Per-Task / Per-Feature Model Selection & Role Title Formatting (REQ-003, REQ-006)
Prompt the developer before launching parallel subagents:
- **Default Model (`Model: "flash"`)**: If no custom model is specified, subagents default to `Model: "flash"` (the top normal Gemini model, currently **Gemini 3.8 Flash**). Subagent `Role` titles default to `(3.8 Flash High)` (e.g. `Role: "Child Feature Lead (3.8 Flash High)"`). Optional thinking effort levels for 3.8 Flash include `(3.8 Flash Low)`, `(3.8 Flash Medium)`, and `(3.8 Flash High)`.
- **High-Complexity Override (`Model: "inherit"` or `Model: "pro"`)**: For complex child features (e.g. core graph storage, query planners, synchronization primitives), pass `Model: "inherit"` (inheriting the parent session's frontier model, e.g., **Gemini 4 Argon High**) or `Model: "pro"`. The subagent `Role` title MUST explicitly reflect this: e.g. `Role: "Child Feature Lead (4 Argon High)"`.
- **Explicit Role Tag Format**: Every subagent dispatched via `invoke_subagent` MUST append the exact `<Version> <Model> <Effort>` tag to its `Role` parameter:
  - Default: `<Role Title> (3.8 Flash High)`
  - Effort variants: `<Role Title> (3.8 Flash Low)`, `<Role Title> (3.8 Flash Medium)`
  - Complex override: `<Role Title> (4 Argon High)`
  - Future models (e.g., `4 Flash High`): `<Role Title> (4 Flash High)`

### Subagent Dispatch Protocol (REQ-002, REQ-003, REQ-006)
Dispatch concurrent child feature subagents via `invoke_subagent`:

**Default Execution (Gemini 3.8 Flash High)**:
```json
{
  "TypeName": "self",
  "Role": "Child Feature Lead (3.8 Flash High)",
  "Model": "flash",
  "Prompt": "Execute child feature ft-<slug> from epic ec-<id>. Strictly confine changes to designated repos and seams. Update status via aico-cli.mjs task-status."
}
```

**Complex Architecture Override (Gemini 4 Argon High)**:
```json
{
  "TypeName": "self",
  "Role": "Child Feature Lead (4 Argon High)",
  "Model": "inherit",
  "Prompt": "Execute child feature ft-<slug> from epic ec-<id>. Strictly confine changes to designated repos and seams. Update status via aico-cli.mjs task-status."
}
```
- Subagents operate on their isolated feature seam and update plan tasks via `aico-cli.mjs task-status` (backed by atomic .lock file synchronization).
- The parent epic agent monitors subagent progress, verifies cross-feature contracts, and handles final convergence.

---

## Completion Criteria (Framing & Planning Phase)
- [ ] Epic directory created under `<project>-specs/epics/ec-{short_id}/features/`.
- [ ] Overarching brainstorm saved as `brain-ec-{short_id}.md`.
- [ ] Child feature directories created under `features/` with `ft-` prefix.
- [ ] Child features created via `/aico-feature` (Phase 1: spec & plan).
- [ ] All child specs and plans declare `order: <number>`, `aico_skills_version` (matching `aico-skills/plugin.json`), and `epic: "ec-{short_id}"`.
- [ ] Child feature tasks organized in a vertical tracer-bullet DAG with explicit dependencies.
- [ ] Epic visible in the AICO WebUI Epic Hub.
- [ ] **Agent output `[AICO GATE: Waiting for Confirmation]` and halted at the Human Review Gate and requested user approval before writing any code.**
