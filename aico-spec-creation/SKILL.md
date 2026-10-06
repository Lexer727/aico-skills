---
name: aico-spec-creation
description: "Draft unambiguous, testable feature specifications using strict EARS syntax patterns, immutable requirement IDs, universal YAML frontmatter with decoupled ordering, and explicit out-of-scope boundaries."
disable-model-invocation: false
---

# AICO Spec Creation: Contract Synthesis & EARS Grammar

Transform brainstorms and deep-dives into an immutable, verifiable contract specification (`spec-ft-{slug}.md`).

---

## 1. The EARS Requirements Grammar

Every functional requirement **must strictly conform** to one of the 5 canonical EARS patterns and use the mandatory modal **shall** exactly once:

| Pattern | Template | When to Use |
| :--- | :--- | :--- |
| **Ubiquitous** | The `<system>` shall `<response>`. | Always-active capability with no precondition. |
| **Event-Driven** | When `<trigger>`, the `<system>` shall `<response>`. | Discrete event or user action. |
| **State-Driven** | While `<state>`, the `<system>` shall `<response>`. | Behavior holding during a continuous state. |
| **Unwanted Behavior** | If `<condition>`, then the `<system>` shall `<response>`. | Error handling, timeouts, invalid input. |
| **Optional Feature** | Where `<feature>`, the `<system>` shall `<response>`. | Behavior tied to an optional/configurable flag. |

*See [`EARS-CHEATSHEET.md`](EARS-CHEATSHEET.md) for full examples, complex combinations, and anti-patterns.*

---

## 2. Blueprint & Schema Rules

1. **Mandatory Line-1 YAML Frontmatter**: Must include:
   - `id`: `spec-ft-{feature_slug}` (e.g. `spec-ft-core-discovery`, `spec-ft-fast-trace`).
   - `type: spec`
   - `aico_version: "0.1.2"`
   - `epic`: `"ec-{short_id}"` (or `null` if standalone).
   - `order`: `<integer>` (governs visual sort sequence without altering directory names).
   - `title`: Human-readable capability title.
   - `status`: `Draft` | `Pending` | `In Progress` | `Completed`.
   - `derives_from`: List of derived ADR IDs or Brainstorm IDs.
   - `created_at`: ISO 8601 UTC timestamp.
2. **Lifecycle Status Progression**:
   - `Draft`: During authoring and refinement.
   - `Pending`: Approved and queued for planning/implementation.
   - `In Progress`: Actively being coded or verified.
   - `Completed`: All requirements verified with green seam tests.
3. **No Duplicated Body Metadata**: Never repeat `ID`, `Status`, `Derives From`, or `Title` beneath the top markdown heading. The document body contains only domain content and requirements.
4. **Strict Relative Linking**: All markdown references to other specifications, ADRs, or plans must use portable relative paths (e.g. `../../adr/0001-...md`), never machine-specific `file:///` URLs.

---

## 3. Process

### Step 1: Ingest Context
Load the parent brainstorm (`brain-ec-*.md` or single-feature brainstorm), deep-dive (`dive-ft-*.md`), and `GLOSSARY.md`. Verify that all domain terms match the canonical glossary.

### Step 2: Formulate EARS Requirements
- Translate each user story into atomic, testable requirements assigned sequential, stable identifiers (`REQ-001`, `REQ-002`, ...).
- **Split compound requirements**: If a statement contains "and" or multiple responses, split it into separate `REQ-###` items.
- Ensure every `<system>` is explicitly named (e.g. `The HostDaemon shall...`, never passive `Files are watched`).
- If an aspect is genuinely unknown, append `[NEEDS CLARIFICATION: <question>]`.

### Step 3: Designate Test Seams
Define explicit contract test seams:
- Where in the codebase will this requirement be verified?
- Tag unit and integration test functions with `@verifies spec-ft-<slug>::req-###`.

### Step 4: Define Negative & Boundary Cases
Add at least one `Unwanted Behavior` pattern for:
- Invalid input or malformed configurations.
- Boundary condition limits (file sizes, memory limits, timeouts).
- Authentication or authorization failures.

### Step 5: Declare Explicit Scope Boundaries
- Document `## In-Scope`: Explicit list of included capabilities and architectural features.
- Document `## Out-of-Scope`: Explicit list of excluded items, non-goals, and deferred features (always hyphenated: `## Out-of-Scope`).

---

## Completion Criteria
- [ ] Frontmatter includes canonical `spec-ft-<slug>` ID, `epic`, `order`, and `status`.
- [ ] Explicit `## In-Scope` and `## Out-of-Scope` sections populated.
- [ ] Every requirement follows strict EARS grammar with a single "shall".
- [ ] Negative paths and edge cases addressed.
- [ ] Public test seams designated.
