# AICO Workspace Rules & Guardrails

## 1. Mandatory Review & Approval Gates
- **No Premature Implementation**: Under no circumstances shall the agent begin writing implementation code, modifying test files, or updating specifications without explicit developer review and sign-off.
- **Strict 4-Phase Sequence**:
  1. **Investigate & Diagnose**: Explore the problem, inspect code/specs, identify root causes, and clarify architectural trade-offs.
  2. **Present Proposals & Await Spec Sign-Off**: Present the findings, proposed changes to specifications/features, affected test seams, and the vertical tracer-bullet task DAG. Halt and wait for developer approval before writing spec/plan files.
  3. **Write Specs/Plans & Halt for Implementation Confirmation**: Once approved, write or update the `spec-*.md` and `plan-*.md` artifacts (`status: "Draft"`), run `verify-artifacts.mjs`, and **immediately halt**. Never write/update specs and implement code in the same turn.
  4. **Implement Only After Post-Spec Confirmation**: Wait for explicit developer confirmation of the written specification and plan files before modifying any codebase source or test files.

## 2. AICO Blueprint Conformance
- All specification and plan artifacts must strictly adhere to Blueprint v0.1.2 standards with decoupled YAML frontmatter ordering and relative links.
- No absolute `file:///` URIs inside markdown files.
