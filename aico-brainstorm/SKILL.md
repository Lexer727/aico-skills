---
name: aico-brainstorm
description: "Explore problem spaces, clarify ambiguous requirements, analyze trade-offs, and establish domain terminology before drafting specifications. Queries LanceDB and runs Socratic grilling."
disable-model-invocation: false
---

# AICO Brainstorm: Problem Exploration & Socratic Grilling

The first step of the feature flow. Transform raw feature ideas, rough user notes, or business requests into a sharp architectural framing document (`BRAIN-{domain}-{slug}.md`).

---

## Process

### 1. Hybrid Context Retrieval via `search_hybrid`
Before asking questions, retrieve prior context using the AICO MCP tool `search_hybrid` (`query`, `top_k`) across **LanceDB** and **Kùzu** (or local docs in meta-mode):
- Search for related existing ADRs in `adr/`.
- Search for related brainstorms (`brain-ec-*.md`, `brain-ft-*.md`) and existing specifications (`spec-ft-*.md`).
- Inspect `glossary.md` for relevant terminology.

### 2. Socratic Grilling Loop
Map the problem space as a **design tree**. Identify the **decision frontier**: the questions that can be asked *now* without guessing future answers.

Present questions in **rounds** (maximum 3–4 high-impact questions per round). **Never ask a question without providing your recommended answer and reasoning**:

```markdown
❓ **Q1** - **<Decision Title>**: <Context and question, including concrete options>

➡️ **Recommended**: Option [A] - <1-2 sentences explaining why this best balances performance, maintainability, and safety>
```

- When a question requires a fact from the filesystem, codebase, or documentation, dispatch a subagent or tool call to find it; **never ask the user for facts you can look up yourself**.
- If a question reveals a need to test a complex UI layout or state transition machine with runnable code, pause the interview and detour to **`/aico-prototype`**.

### 3. Inline Domain Modeling
Call `aico-domain-modeling` during the conversation:
- Challenge vague or overloaded words immediately.
- Update `glossary.md` inline as canonical terms crystallize (`aico-cli.mjs upsert-glossary`).
- If a major irreversible architectural trade-off is settled, record an ADR in `adr/` (`aico-cli.mjs scaffold-adr`).

### 4. Artifact Generation via `aico-cli.mjs`
Once the decision frontier is settled, scaffold the brainstorm document (`brain-ec-<id>.md` or `brain-ft-<slug>.md`) via `aico-cli.mjs`:
```bash
# For an Epic brainstorm:
node <skills-path>/scripts/aico-cli.mjs scaffold-epic --specs-dir <specs-root> --id <short_id> --title "<Descriptive Title>"

# Or for a Feature brainstorm:
node <skills-path>/scripts/aico-cli.mjs scaffold-feature --specs-dir <specs-root> --slug <slug> --title "<Descriptive Title>" --with-brain
```
Then populate the brainstorm body sections (`Executive Summary & Problem Statement`, `Explored Approaches & Trade-offs`, and `Core Enhancements & Decisions`).

---

## Completion Criteria
- [ ] Decision frontier empty (all critical architectural questions settled).
- [ ] Domain terms updated in `GLOSSARY.md`.
- [ ] Brainstorm artifact generated and committed.
- [ ] Ready for `/aico-deep-dive` or `/aico-spec-creation`.
