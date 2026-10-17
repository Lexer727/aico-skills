---
name: aico-deep-dive
description: "Perform system boundary, dependency graph traversal, and blast-radius analysis before designing or refactoring modules. Walks Kùzu graph and designates test seams."
disable-model-invocation: false
---

# AICO Deep-Dive: System Boundaries & Blast Radius

Run before drafting formal contracts to investigate existing code structure, evaluate module depth, and calculate the blast radius of proposed changes.

---

## Process

### 1. Kùzu Graph Traversal via `query_lineage_graph`
Invoke the AICO MCP tool `query_lineage_graph` (`symbol`, `hops: 1..4`) or execute openCypher traversals in Kùzu across 2 to 4 hops:
```cypher
// Trace all transitive callers and dependents of the target module/symbol
MATCH path = (target:Module {name: $module_name})<-[:IMPORTS|CALLS*1..4]-(caller)
RETURN path;

// Find existing test coverage for the target module
MATCH (t:Test)-[:VERIFIES]->(req:Requirement)<-[:IMPLEMENTS]-(target:CodeSymbol)
WHERE target.module = $module_name
RETURN t, req;
```

### 2. Blast Radius Classification
Categorize the intended change into one of two patterns:

- **Pattern A: Tracer Bullet (Contained)**
  - Localized change where public module contracts remain stable or backwards-compatible.
  - Can be built end-to-end within existing seams in a single sequence.

- **Pattern B: Wide Refactor (Systemic)**
  - A mechanical change (retyping a core entity, altering an IPC interface) whose blast radius touches dozens of files simultaneously.
  - **Must be sequenced as Expand–Contract**:
    1. *Expand*: Introduce the new interface/schema alongside the legacy one.
    2. *Migrate*: Migrate callers in discrete, testable batches (per module/directory).
    3. *Contract*: Delete the legacy interface once all callers are verified on the new one.

### 3. Public Seam Designation
Consult `aico-codebase-design`:
- Identify the highest public seam where behavior can be observed without reaching into internals.
- Enforce the rule: *the interface is the test surface*.
- Confirm designated seams with the developer.

### 4. Artifact Generation via `aico-cli.mjs`
Scaffold the deep-dive document (`dive-ft-<slug>.md`) deterministically via `aico-cli.mjs`:
```bash
node <skills-path>/scripts/aico-cli.mjs scaffold-feature --specs-dir <specs-root> [--epic ec-<id>] --slug <slug> --title "<Title>" --with-dive
```
Then populate the deep-dive body sections (`System Boundary & Affected Modules`, `Dependency Walk & Blast Radius`, and `Designated Public Seams`).

---

## Completion Criteria
- [ ] Transitive callers and dependents enumerated.
- [ ] Pattern classified (Tracer bullet vs Expand-Contract).
- [ ] Public test seams designated.
- [ ] Deep-dive artifact committed.
