# AICO Workspace Rules & Guardrails

## 1. Mandatory Review & Approval Gate
- **No Premature Implementation**: Under no circumstances shall the agent begin writing implementation code, modifying test files, or updating specifications without explicit developer review and sign-off.
- **Strict 3-Phase Sequence**:
  1. **Investigate & Diagnose**: Explore the problem, inspect code/specs, identify root causes, or evaluate architectural trade-offs.
  2. **Present Proposals**: Present the findings, the exact proposed changes to specifications/features, affected test seams, and the vertical tracer-bullet task DAG.
  3. **Halt & Await Sign-Off**: Stop tool calls and prompt the developer for review. Do not invoke write/edit tools until the developer explicitly approves the plan.

## 2. AICO Blueprint Conformance
- All specification and plan artifacts must strictly adhere to Blueprint v0.1.2 standards with decoupled YAML frontmatter ordering and relative links.
- No absolute `file:///` URIs inside markdown files.
