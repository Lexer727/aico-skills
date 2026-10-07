---
id: plan-ft-{feature_slug}
type: plan
aico_skills_version: "{aico_skills_version}" # Read dynamically from aico-skills/VERSION
epic: "ec-{short_id}" # or null if standalone feature
order: 1
title: "{Title} Implementation Plan"
status: Pending
derives_from: ["spec-ft-{feature_slug}"]
created_at: "{YYYY-MM-DDTHH:MM:SSZ}"
---

# Implementation Plan: {Title}

## 1. Technical Architecture & Decisions
Brief summary of chosen libraries, data structures, and architectural patterns.

## 2. Task Graph (DAG)

### Phase 1: Prefactoring & Scaffolding (Unblocked Frontier)
- **TASK-001**: {Task Title}
  - **Status**: Pending
  - **Addresses**: REQ-001, REQ-002
  - **Blocked by**: None (Can start immediately)
  - **What it delivers**: Vertical slice verifying...

### Phase 2: Core Vertical Slices
- **TASK-002**: {Task Title}
  - **Status**: Blocked
  - **Addresses**: REQ-003
  - **Blocked by**: TASK-001
  - **What it delivers**: ...

### Phase 3: Integration & Edge Conditions
- **TASK-003**: {Task Title}
  - **Status**: Blocked
  - **Addresses**: REQ-004
  - **Blocked by**: TASK-002
  - **What it delivers**: ...

<!-- Note on Task Mutations:
If a task is canceled or rewritten, never delete or overwrite it. Instead, set:
- **TASK-XYZ**: {Task Title}
  - **Status**: Skipped/Canceled | Rewritten
  - **Reason**: {Detailed rationale for cancellation/rewrite}
  - **Rewrite Target**: [TASK-XYZ-V2](#task-xyz-v2) or {reference to replacement}
-->

