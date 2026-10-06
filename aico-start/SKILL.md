---
name: aico-start
description: "Universal front door and triage entry point for any new request, capability, or feature. Conducts initial problem exploration, trade-off analysis, and Socratic grilling, then routes to an Epic (aico-epic) or Standalone Feature (aico-feature)."
disable-model-invocation: false
---

# AICO Start: Universal Entry Point & Architecture Triage

`aico-start` is the primary entry point for any new engineering request, idea, or capability in an AICO project. Rather than immediately scaffolding files, `aico-start` conducts initial problem framing and Socratic exploration, then routes the request to either an **Epic** (`/aico-epic`) or a **Standalone Feature** (`/aico-feature`).

---

## 1. The Triage Flow

```
                      User Prompt / Idea / Requirement
                                     │
                                     ▼
                            ┌────────────────┐
                            │  /aico-start   │
                            │ (Brainstorm &  │
                            │  Socratic Triage)
                            └────────┬───────┘
                                     │
                     Is it composite, multi-subsystem,
                     or requires multi-milestone waves?
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                   YES                                NO
                    │                                 │
                    ▼                                 ▼
             ┌─────────────┐                   ┌──────────────┐
             │ /aico-epic  │                   │ /aico-feature│
             │ (ec-slug)   │                   │ (ft-slug)    │
             └──────┬──────┘                   └──────────────┘
                    │ (internally calls /aico-feature
                    │  for each child feature)
                    ▼
             ┌──────────────┐
             │ /aico-feature│
             │ (child ft-)  │
             └──────────────┘
```

---

## 2. Process

### Step 1: Ingest Intent & Establish Context
1. Inspect the active project context via `<specs-root>/.aico-project.json`.
2. Parse canonical domain terminology from `<specs-root>/GLOSSARY.md`.
3. Check existing architecture decisions under `<specs-root>/adr/` to avoid contradicting established patterns.

### Step 2: Socratic Exploration & Grilling
Conduct targeted exploration with the developer:
1. **Core Problem & Measurable Value**:
   - What real problem is being solved?
   - What is the observable, measurable outcome?
2. **Blast Radius & System Boundaries**:
   - What subsystems, crates, or modules will be touched?
   - Does this introduce new public contracts, dependencies, or storage schemas?
3. **Trade-offs & Alternatives**:
   - What are the candidate approaches?
   - What trade-offs were considered and why was the chosen approach preferred?

### Step 3: Triage Decision (Epic vs. Standalone Feature)

Evaluate against the triage criteria:

| Criterion | Choose **Epic (`/aico-epic`)** | Choose **Standalone Feature (`/aico-feature`)** |
| :--- | :--- | :--- |
| **Scope & Breadth** | Multi-subsystem initiative (e.g. Host Runtime + Embedded DBs + WebUI Shell). | Cohesive single-capability (e.g. Export tool, Fast Trace validator, CLI flag). |
| **Milestone Decomposition** | Requires multiple child features and multi-milestone convergence. | Single contract specification and single task execution DAG. |
| **Cross-Cutting Consensus** | Requires an overarching shared brainstorm (`brain-ec-*.md`) across child specs. | Self-contained domain boundaries and invariants. |
| **Filesystem Target** | `<specs-root>/epics/ec-<short_id>/features/ft-.../` | `<specs-root>/features/ft-<feature_slug>/` |
| **Frontmatter Epic Tag** | `epic: "ec-<short_id>"` | `epic: null` |
| **Feature Prefix** | Child features use `ft-` | Standalone features use `ft-` |

### Step 4: Routing & Handoff
- **If Epic**:
  - Summarize the high-level concept and overarching trade-offs.
  - Propose a concise identifier: `ec-{short_id}` (e.g. `ec-core`, `ec-specs`, `ec-workspace`).
  - Handoff to `/aico-epic` passing the gathered brainstorm context.
- **If Standalone Feature**:
  - Summarize the atomic scope, designated seams, and target directory (`features/ft-<feature_slug>/`).
  - Handoff to `/aico-feature` passing the requirements context.

---

## Completion Criteria
- [ ] Problem statement and measurable value established.
- [ ] Ubiquitous terminology aligned with `GLOSSARY.md`.
- [ ] Scope evaluated against Epic vs. Standalone Feature criteria.
- [ ] Developer confirmed the path (Epic or Standalone Feature).
- [ ] Routed to `/aico-epic` or `/aico-feature` with pre-populated context.
