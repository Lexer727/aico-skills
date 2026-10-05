---
id: SPEC-{domain}-{seq}
type: spec
aico_version: "0.1.1"
epic: "{epic-slug}"
title: "{Title}"
status: Draft
derives_from: ["BRAIN-...", "ADR-..."]
created_at: "{YYYY-MM-DDTHH:MM:SSZ}"
---

# Feature Specification: {Title}

## 1. Problem Statement & User Value
Describe the user problem and the measurable value delivered by this feature from the user perspective.

## 2. User Stories
1. **US-01** (Priority: P1): As an `<actor>`, I want `<capability>`, so that `<benefit>`.
   - *Independent Test*: How this story can be verified independently as an MVP slice.
2. **US-02** (Priority: P2): ...

## 3. Functional Requirements (EARS)

### Ubiquitous
- **REQ-001**: The `<system>` shall `<response>`.

### Event-Driven
- **REQ-002**: When `<trigger>`, the `<system>` shall `<response>`.

### State-Driven
- **REQ-003**: While `<state>`, the `<system>` shall `<response>`.

### Unwanted Behavior & Errors
- **REQ-004**: If `<error condition>`, then the `<system>` shall `<response>`.

### Optional Features
- **REQ-005**: Where `<feature flag>`, the `<system>` shall `<response>`.

## 4. Designated Public Test Seams
- **Primary Seam**: The public module interface where tests will observe behavior.
- **Verification Strategy**: Contract and behavioral integration testing without reaching into internals.

## 5. Out of Scope
- {Explicitly excluded item 1}
- {Explicitly excluded item 2}

## 6. Open Clarifications
- {List of any [NEEDS CLARIFICATION] items, or "None."}
