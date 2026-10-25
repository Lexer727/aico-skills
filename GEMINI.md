# AICO Workspace Rules & Guardrails

## 1. Mandatory Review & Approval Gates
- **No Premature Implementation**: Under no circumstances shall the agent begin writing implementation code, modifying test files, or updating specifications without explicit developer review and sign-off.
- **Strict 4-Phase Sequence**:
  1. **Investigate & Diagnose**: Explore the problem, inspect code/specs, identify root causes, and clarify architectural trade-offs.
  2. **Present Proposals & Await Spec Sign-Off**: Present the findings, proposed changes to specifications/features, affected test seams, and the vertical tracer-bullet task DAG. Halt and wait for developer approval before writing spec/plan files.
  3. **Write Specs/Plans & Halt for Implementation Confirmation**: Once approved, write or update the `spec-*.md` and `plan-*.md` artifacts (`status: "Draft"`), run `verify-artifacts.mjs`, and **immediately halt**. Never write/update specs and implement code in the same turn.
  4. **Implement & Push Upon Verification**: Wait for explicit developer confirmation of the written specification and plan files before modifying any codebase source or test files. Once implementation is complete, all tests turn green, linters pass, and `verify-artifacts.mjs` succeeds, automatically stage, commit with conventional commit messages, and push across all affected repositories.

## 2. Interactive Multi-Choice Gates & Clarifications
- **Interactive Multi-Choice Gate Execution**: When halting at Phase 2 (Spec Sign-Off Gate) and Phase 3 (Implementation Confirmation Gate), the agent MUST invoke the interactive `ask_question` tool with structured selectable choices (e.g., `(Recommended) Approve and proceed`, candidate architectural options, `Cancel`) so the developer can confirm with one click or enter adjustments via the write-in option, instead of passively ending turns with text.
- **Structured Socratic Clarifications**: Whenever clarifying underspecified requirements, architectural alternatives, or design trade-offs (e.g. during `/aico-start` or `/aico-brainstorm`), the agent MUST use `ask_question` with structured options.

## 3. AICO Blueprint Conformance
- All specification and plan artifacts must strictly adhere to Blueprint v0.1.2 standards with decoupled YAML frontmatter ordering and relative links.
- No absolute `file:///` URIs inside markdown files.
