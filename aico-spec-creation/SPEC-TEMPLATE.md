---
id: spec-ft-{feature_slug}
type: spec
aico_skills_version: "{aico_skills_version}" # Read dynamically from aico-skills/plugin.json
epic: "ec-{short_id}" # or null if standalone feature
order: 1
title: "{Title}"
status: Draft
derives_from: ["brain-...", "adr-..."]
created_at: "{YYYY-MM-DDTHH:MM:SSZ}"
---

# Feature Specification: {Title}

## 1. Problem Statement & User Value
Describe the user problem and the measurable value delivered by this feature from the user perspective.

## 2. In-Scope
- {Explicitly included capability 1}
- {Explicitly included capability 2}

## 3. Out-of-Scope
- {Explicitly excluded item 1}
- {Explicitly excluded item 2}

## 4. User Stories
1. **US-01** (Priority: P1): As an `<actor>`, I want `<capability>`, so that `<benefit>`.
   - *Independent Test*: How this story can be verified independently as an MVP slice.
2. **US-02** (Priority: P2): ...

## 5. Functional Requirements (EARS)

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

## 6. Designated Public Test Seams
- **Primary Seam**: The public module interface where tests will observe behavior.
- **Verification Strategy**: Contract and behavioral integration testing without reaching into internals.

## 7. Open Clarifications
- {List of any [NEEDS CLARIFICATION] items, or "None."}
