# Architecture Decision Record (ADR) Format

File path convention: `adr/{NNNN}-{kebab-case-title}.md` (e.g., `adr/0001-host-runtime-and-network-topology.md`).

All ADRs must begin with a canonical YAML frontmatter block on line 1 without duplicating fields in the body.

```markdown
---
id: ADR-{NNNN}
type: adr
aico_skills_version: "0.1.2"
title: "{Decision Title}"
status: Completed
derives_from: []
created_at: "{YYYY-MM-DDTHH:MM:SSZ}"
---

# ADR-{NNNN}: {Decision Title}

## Context & Problem Statement
What is the situation and problem we are facing? State the forces at play (technical, organizational, performance).

## Decision Drivers
- Driver 1 (e.g. Zero-daemon footprint, must run in-process)
- Driver 2 (e.g. Sub-10ms graph path traversals)
- Driver 3 (e.g. Apache 2.0 or MIT license)

## Considered Options
1. {Option A}
2. {Option B}
3. {Option C}

## Decision Outcome
Chosen option: "{Option A}", because {core rationale addressing drivers}.

### Positive Consequences
- {Benefit 1}
- {Benefit 2}

### Negative Consequences / Trade-offs
- {Trade-off 1}
- {Trade-off 2}

## Pros and Cons of the Options

### {Option A} (Chosen)
- Good, because {pro}
- Bad, because {con}

### {Option B}
- Good, because {pro}
- Bad, because {con}
```
