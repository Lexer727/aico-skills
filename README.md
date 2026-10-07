# AICO SDD Skills (`aico-skills`)

> The canonical Spec-Driven Development (SDD) harness for autonomous and human-in-the-loop AI coding agents.

`aico-skills` is a modular, open agent skill suite implementing rigorous **Spec-Driven Development**. It bridges the gap between high-level architectural intent and verified, working code by enforcing test-before-code guarantees, formal requirements syntax (EARS), and deterministic graph traceability.

---

## 1. Skill Catalog

| Skill | Role | Invocation | Primary Artifact / Output |
| :--- | :--- | :--- | :--- |
| **[`aico-guide`](aico-guide/SKILL.md)** | Global router and navigator over all skills | User-invoked | Triage decision & recommended skill |
| **[`aico-wayfinder`](aico-wayfinder/SKILL.md)** | High-fog greenfield navigation & decision mapping | User-invoked | `.scratch/wayfinder/{slug}/map.md` |
| **[`aico-epic`](aico-epic/SKILL.md)** | Scaffold, frame, and orchestrate engineering epics | Model/User | `epics/{seq}-{slug}/BRAIN-{slug}.md` |
| **[`aico-code-to-spec`](aico-code-to-spec/SKILL.md)** | Brownfield codebase reverse-engineering to SDD specs | User-invoked | Reconstructed EARS specs & test seams |
| **[`aico-brainstorm`](aico-brainstorm/SKILL.md)** | Problem exploration, trade-off analysis & Socratic grilling | Model/User | `epics/{seq}-{slug}/BRAIN-{slug}.md` |
| **[`aico-prototype`](aico-prototype/SKILL.md)** | Throwaway spike code for UI and state machine questions | User-invoked | `prototype/{slug}` branch & interactive HTML |
| **[`aico-deep-dive`](aico-deep-dive/SKILL.md)** | Kùzu graph walk, blast radius & public seam designation | Model/User | `deep-dives/{domain}/DIVE-{seq}-{slug}.md` |
| **[`aico-spec-creation`](aico-spec-creation/SKILL.md)** | Contract synthesis with 5 EARS patterns & out-of-scope boundaries | Model/User | `specs/{slug}/SPEC-{slug}.md` |
| **[`aico-planning`](aico-planning/SKILL.md)** | Task graph (DAG) decomposition & active frontier calculation | Model/User | `specs/{slug}/PLAN-{slug}.md` |
| **[`aico-plan-amendment`](aico-plan-amendment/SKILL.md)** | Non-destructive plan & task mutation across epics | Model/User | Updated `PLAN-*.md` DAG & recomputed frontier |
| **[`aico-test-scaffolding`](aico-test-scaffolding/SKILL.md)** | Red failing contract tests at public seams with `@verifies` tags | Model/User | Red test suite |
| **[`aico-implementation`](aico-implementation/SKILL.md)** | Minimal code to pass tests with `@implements` tags | Model/User | Green test suite |
| **[`aico-diagnosing-bugs`](aico-diagnosing-bugs/SKILL.md)** | Tight-loop defect diagnosis & seam regression locking | Model/User | Passing regression test & clean code |
| **[`aico-review-loop`](aico-review-loop/SKILL.md)** | Two-axis review (Standards vs Spec) & Kùzu graph convergence | Model/User | Convergence report & Phase N tasks |
| **[`aico-verify`](aico-verify/SKILL.md)** | Dual-axis blueprint conformance & ground-truth codebase parity audit | User-invoked | Dual-axis verification report & remediation plan |
| **[`aico-spec-migration`](aico-spec-migration/SKILL.md)** | Universal frontmatter & relative link migration to canonical blueprint standards | User-invoked | Migrated AICO specs & ADR repository |
| **[`aico-codebase-health`](aico-codebase-health/SKILL.md)** | Kùzu graph structural scan for module deepening | User-invoked | Visual HTML before/after report |
| **[`aico-retro`](aico-retro/SKILL.md)** | Session retrospective & environment evolution | User-invoked | Linter rules, pre-commit hooks, pointers |
| **[`aico-domain-modeling`](aico-domain-modeling/SKILL.md)** | Ubiquitous domain language & Architecture Decision Records | Model/User | `GLOSSARY.md` & `docs/adr/*.md` |
| **[`aico-codebase-design`](aico-codebase-design/SKILL.md)** | Deep module principles, leverage, locality & public seams | Reference | Universal design vocabulary |

---

## 2. The Spec-Driven Development Lifecycle

```
/aico-epic ──► /aico-brainstorm ──► /aico-deep-dive ──► /aico-spec-creation ──► /aico-planning
                     │                                                               │
             (prototype spike)                                                       ▼
                                                                           /aico-test-scaffolding
                                                                                     │
                                                                                     ▼
/aico-retro  ◄──  /aico-review-loop  ◄──  /aico-implementation (Red-to-Green)
      ▲                     ▲
      │                     │ (Regressions / Broken Seams)
      └─────────── /aico-plan-amendment / /aico-diagnosing-bugs ◄┘
```

1. **Epic Framing (`/aico-epic`)**: Frame overarching capabilities, track simple vs. composite multi-spec topologies.
2. **Clarification & Socratic Grilling (`/aico-brainstorm`)**: Drill down into user requirements, surface trade-offs, and draft ADRs.
3. **Blast Radius Analysis (`/aico-deep-dive`)**: Analyze graph dependencies and designate public test seams before designing code.
4. **EARS Specification (`/aico-spec-creation`)**: Synthesize unambiguous requirements using the 5 EARS patterns with modal `shall`.
5. **Task DAG Decomposition (`/aico-planning`)**: Slice specifications into vertical tracer bullets with explicit blocking edges and active frontiers.
6. **Red Test Scaffolding (`/aico-test-scaffolding`)**: Write failing contract/behavioral tests at public seams tagged with `// @verifies SPEC-ID::REQ-ID`.
7. **Implementation (`/aico-implementation`)**: Implement minimal code to turn tests green, tagging source symbols with `// @implements SPEC-ID::REQ-ID`.
8. **Verification & Convergence (`/aico-review-loop`)**: Two-axis adversarial review (Standards vs Spec) and structural graph convergence check.

---

## 3. Installation & Integration

### As a Git Submodule (e.g. inside `aico`)
```bash
git submodule add https://github.com/Lexer727/aico-skills.git skills
```

### In Google Antigravity / Agent Runtimes
Clone or symlink into your agent skills directory:
```bash
# Global Antigravity skills
git clone https://github.com/Lexer727/aico-skills.git ~/.gemini/antigravity/skills/aico-skills

# Or workspace-scoped
git clone https://github.com/Lexer727/aico-skills.git .agents/skills
```

---

## 4. Documentation & Foundations
- [skills-specification.md](skills-specification.md): Technical specification of the AICO skill architecture.
- [mattskills-eval-and-extended-skills.md](mattskills-eval-and-extended-skills.md): Evaluation against MattSkills and extended workflow patterns.
- [harness-design-and-comparison.md](harness-design-and-comparison.md): Comparison with Spec Kit, EARS-Req, and traditional agent harnesses.
