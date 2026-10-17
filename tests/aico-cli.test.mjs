import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../scripts/aico-cli.mjs');
const GET_VERSION_PATH = path.resolve(__dirname, '../scripts/get-version.mjs');
const VERIFY_SCRIPT_PATH = path.resolve(__dirname, '../aico-verify/scripts/verify-artifacts.mjs');
const SKILLS_ROOT = path.resolve(__dirname, '..');

function runCli(args, options = {}) {
  return execFileSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    ...options,
  });
}

function createTempSpecsWorkspace(prefix = 'aico-cli-test-') {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const specsDir = path.join(tmpRoot, 'aico-specs');
  const codeDir = path.join(tmpRoot, 'codebase', 'aico');
  fs.mkdirSync(path.join(specsDir, 'adr'), { recursive: true });
  fs.mkdirSync(path.join(specsDir, 'epics'), { recursive: true });
  fs.mkdirSync(path.join(specsDir, 'features'), { recursive: true });
  fs.mkdirSync(path.join(codeDir, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(codeDir, 'src'), { recursive: true });

  // Write .aico-project.json
  fs.writeFileSync(
    path.join(specsDir, '.aico-project.json'),
    JSON.stringify(
      {
        name: 'aico',
        created_at: '2026-10-05T18:45:00Z',
        repositories: [
          { id: 'aico', name: 'AICO Engine', path: '../codebase/aico', type: 'codebase' },
          { id: 'aico-specs', name: 'AICO Specs', path: '.', type: 'specs' },
          { id: 'aico-skills', name: 'AICO Skills', path: '../codebase/aico-skills', type: 'skills' },
        ],
      },
      null,
      2
    ),
    'utf8'
  );

  // Write baseline ADR-0001 and glossary.md
  fs.writeFileSync(
    path.join(specsDir, 'adr', '0001-baseline-architecture.md'),
    [
      '---',
      'id: adr-0001',
      'type: adr',
      'aico_skills_version: "0.1.2"',
      'title: "Baseline Architecture"',
      'status: "Completed"',
      'derives_from: []',
      'created_at: "2026-10-05T15:00:00Z"',
      '---',
      '',
      '# ADR-0001: Baseline Architecture',
      '',
      '## Context & Problem Statement',
      'Baseline context.',
      '',
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(specsDir, 'glossary.md'),
    [
      '---',
      'id: glossary-aico',
      'type: glossary',
      'aico_skills_version: "0.1.2"',
      'title: "AICO Ubiquitous Domain Glossary"',
      'status: "Completed"',
      'derives_from: []',
      'created_at: "2026-10-05T15:00:00Z"',
      '---',
      '',
      '# Domain Glossary',
      '',
      '## Core Concepts',
      '',
    ].join('\n'),
    'utf8'
  );

  return { tmpRoot, specsDir, codeDir };
}

// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-001
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-002
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-003
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-004
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-005
test('test_scaffold_commands', () => {
  const { tmpRoot, specsDir } = createTempSpecsWorkspace();
  try {
    // 1. Version subcommand & get-version.mjs parity
    const cliVer = runCli(['version']).trim();
    const legacyVer = execFileSync(process.execPath, [GET_VERSION_PATH], { encoding: 'utf8' }).trim();
    assert.equal(cliVer, '0.1.2');
    assert.equal(cliVer, legacyVer);

    // 2. Scaffold Epic
    const epicOut = runCli([
      'scaffold-epic',
      '--specs-dir',
      specsDir,
      '--id',
      'core',
      '--title',
      'Core Platform Epic',
      '--derives-from',
      'ADR-0001',
      '--json',
    ]);
    const epicJson = JSON.parse(epicOut);
    assert.equal(epicJson.epicId, 'ec-core');
    assert.ok(fs.existsSync(path.join(specsDir, 'epics', 'ec-core', 'features')));
    const brainPath = path.join(specsDir, 'epics', 'ec-core', 'brain-ec-core.md');
    assert.ok(fs.existsSync(brainPath));
    const brainContent = fs.readFileSync(brainPath, 'utf8');
    assert.ok(brainContent.startsWith('---\nid: brain-ec-core\n'));
    assert.ok(brainContent.includes('aico_skills_version: "0.1.2"'));
    assert.ok(brainContent.includes('../../adr/0001-baseline-architecture.md'));

    // 3. Scaffold Epic-Child Features (auto-incrementing order 1 -> 2)
    const feat1Out = runCli([
      'scaffold-feature',
      '--specs-dir',
      specsDir,
      '--epic',
      'ec-core',
      '--slug',
      'auth',
      '--title',
      'Authentication Service',
      '--repos',
      'aico,aico-specs',
      '--derives-from',
      'brain-ec-core,ADR-0001',
      '--with-dive',
      '--json',
    ]);
    const feat1 = JSON.parse(feat1Out);
    assert.equal(feat1.featureSlug, 'ft-core-auth');
    assert.equal(feat1.order, 1);

    const spec1Content = fs.readFileSync(feat1.specPath, 'utf8');
    assert.ok(spec1Content.includes('id: spec-ft-core-auth'));
    assert.ok(spec1Content.includes('epic: "ec-core"'));
    assert.ok(spec1Content.includes('order: 1'));
    assert.ok(spec1Content.includes('status: "Draft"'));
    assert.ok(spec1Content.includes('../../../../adr/0001-baseline-architecture.md'));

    const plan1Content = fs.readFileSync(feat1.planPath, 'utf8');
    assert.ok(plan1Content.includes('repositories: ["aico", "aico-specs"]'));
    assert.ok(fs.existsSync(feat1.divePath));

    const feat2Out = runCli([
      'scaffold-feature',
      '--specs-dir',
      specsDir,
      '--epic',
      'ec-core',
      '--slug',
      'storage',
      '--title',
      'Storage Engine',
      '--repos',
      'aico',
      '--json',
    ]);
    const feat2 = JSON.parse(feat2Out);
    assert.equal(feat2.order, 2);

    // 4. Scaffold Standalone Feature (depth 2 relative ADR link)
    const standaloneOut = runCli([
      'scaffold-feature',
      '--specs-dir',
      specsDir,
      '--slug',
      'fast-trace',
      '--title',
      'Fast Traceability',
      '--repos',
      'aico',
      '--derives-from',
      'ADR-0001',
      '--json',
    ]);
    const standalone = JSON.parse(standaloneOut);
    assert.equal(standalone.featureSlug, 'ft-fast-trace');
    const standaloneSpec = fs.readFileSync(standalone.specPath, 'utf8');
    assert.ok(standaloneSpec.includes('epic: null'));
    assert.ok(standaloneSpec.includes('../../adr/0001-baseline-architecture.md'));

    // 5. Scaffold ADR & Upsert Glossary
    const adrOut = runCli([
      'scaffold-adr',
      '--specs-dir',
      specsDir,
      '--slug',
      'hybrid-tooling',
      '--title',
      'Hybrid Tooling Architecture',
      '--json',
    ]);
    const adrJson = JSON.parse(adrOut);
    assert.equal(adrJson.adrId, 'adr-0002');
    assert.ok(adrJson.path.endsWith('0002-hybrid-tooling.md'));

    runCli([
      'upsert-glossary',
      '--specs-dir',
      specsDir,
      '--term',
      'Deterministic CLI',
      '--definition',
      'Zero-dependency script engine executing SDD operations.',
      '--synonyms',
      'Helper script, bash wrapper',
      '--example',
      'node scripts/aico-cli.mjs task-status',
    ]);
    const glossaryContent = fs.readFileSync(path.join(specsDir, 'glossary.md'), 'utf8');
    assert.ok(glossaryContent.includes('### Deterministic CLI'));
    assert.ok(glossaryContent.includes('Zero-dependency script engine executing SDD operations.'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-006
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-010
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-011
test('test_task_status_and_rollup', () => {
  const { tmpRoot, specsDir, codeDir } = createTempSpecsWorkspace();
  try {
    runCli(['scaffold-epic', '--specs-dir', specsDir, '--id', 'core', '--title', 'Core']);
    const feat = JSON.parse(
      runCli([
        'scaffold-feature',
        '--specs-dir',
        specsDir,
        '--epic',
        'ec-core',
        '--slug',
        'auth',
        '--title',
        'Auth',
        '--repos',
        'aico',
        '--json',
      ])
    );

    // Populate two tasks in plan-ft-core-auth.md (TASK-AUTH-001 -> blocks TASK-AUTH-002)
    const planContent = [
      '---',
      'id: plan-ft-core-auth',
      'type: plan',
      'aico_skills_version: "0.1.2"',
      'epic: "ec-core"',
      'order: 1',
      'title: "Auth Implementation Plan"',
      'status: "Draft"',
      'repositories: ["aico"]',
      'derives_from: ["spec-ft-core-auth"]',
      'created_at: "2026-10-17T20:00:00Z"',
      '---',
      '',
      '# Implementation Plan: Auth',
      '',
      '## 1. Technical Architecture & Decisions',
      '- Auth module.',
      '',
      '## 2. Task Graph (DAG)',
      '',
      '### Phase 1: Core',
      '',
      '- **TASK-AUTH-001**: Token Validator',
      '  - **Status**: Pending',
      '  - **Addresses**: `REQ-001`',
      '  - **Blocked by**: None',
      '  - **What it delivers**:',
      '    - Validator logic',
      '  - **Verification Seam**: `tests/auth_test.rs::test_token`',
      '',
      '- **TASK-AUTH-002**: Session Middleware',
      '  - **Status**: Blocked',
      '  - **Addresses**: `REQ-001`',
      '  - **Blocked by**: `TASK-AUTH-001`',
      '  - **What it delivers**:',
      '    - Middleware',
      '  - **Verification Seam**: `tests/auth_test.rs::test_middleware`',
      '',
    ].join('\n');
    fs.writeFileSync(feat.planPath, planContent, 'utf8');

    // 1. Reject Skipped/Canceled without --reason (REQ-010)
    assert.throws(() => {
      runCli(['task-status', '--plan', feat.planPath, '--task', 'TASK-AUTH-001', '--status', 'Skipped/Canceled']);
    });

    // 2. Reject Rewritten without --rewrite-target (REQ-010)
    assert.throws(() => {
      runCli([
        'task-status',
        '--plan',
        feat.planPath,
        '--task',
        'TASK-AUTH-001',
        '--status',
        'Rewritten',
        '--reason',
        'Changed approach',
      ]);
    });

    // 3. Transition TASK-AUTH-001 to In Progress -> Plan & Spec roll up to "In Progress"
    runCli(['task-status', '--plan', feat.planPath, '--task', 'TASK-AUTH-001', '--status', 'In Progress']);
    assert.ok(fs.readFileSync(feat.planPath, 'utf8').includes('status: "In Progress"'));
    assert.ok(fs.readFileSync(feat.specPath, 'utf8').includes('status: "In Progress"'));

    // 4. Reject transition to Done when --code-dir is passed and seam/annotations are missing (REQ-011)
    assert.throws(() => {
      runCli([
        'task-status',
        '--plan',
        feat.planPath,
        '--task',
        'TASK-AUTH-001',
        '--status',
        'Done',
        '--code-dir',
        codeDir,
      ]);
    });

    // 5. Create seam file & annotations in codeDir, then transition TASK-AUTH-001 to Done
    fs.writeFileSync(
      path.join(codeDir, 'tests', 'auth_test.rs'),
      '// @verifies spec-ft-core-auth::TASK-AUTH-001::REQ-001\n#[test] fn test_token() {}\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(codeDir, 'src', 'lib.rs'),
      '// @implements spec-ft-core-auth::TASK-AUTH-001::REQ-001\npub fn validate() {}\n',
      'utf8'
    );

    runCli([
      'task-status',
      '--plan',
      feat.planPath,
      '--task',
      'TASK-AUTH-001',
      '--status',
      'Done',
      '--code-dir',
      codeDir,
    ]);

    // Verify TASK-AUTH-002 automatically unblocked from Blocked -> Pending!
    const afterTask1 = fs.readFileSync(feat.planPath, 'utf8');
    assert.match(afterTask1, /- \*\*TASK-AUTH-002\*\*:[^\n]*\n\s+- \*\*Status\*\*: Pending/);

    // 6. Transition TASK-AUTH-002 to Skipped/Canceled with --reason -> All tasks terminal -> Plan, Spec, and Epic Brainstorm roll up to "Completed"
    runCli([
      'task-status',
      '--plan',
      feat.planPath,
      '--task',
      'TASK-AUTH-002',
      '--status',
      'Skipped/Canceled',
      '--reason',
      'Deferred to next milestone',
    ]);

    assert.ok(fs.readFileSync(feat.planPath, 'utf8').includes('status: "Completed"'));
    assert.ok(fs.readFileSync(feat.specPath, 'utf8').includes('status: "Completed"'));
    const brainPath = path.join(specsDir, 'epics', 'ec-core', 'brain-ec-core.md');
    assert.ok(fs.readFileSync(brainPath, 'utf8').includes('status: "Completed"'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-007
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-008
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-012
test('test_plan_amend_and_frontier', () => {
  const { tmpRoot, specsDir } = createTempSpecsWorkspace();
  try {
    runCli(['scaffold-epic', '--specs-dir', specsDir, '--id', 'core', '--title', 'Core']);
    const feat = JSON.parse(
      runCli([
        'scaffold-feature',
        '--specs-dir',
        specsDir,
        '--epic',
        'ec-core',
        '--slug',
        'auth',
        '--title',
        'Auth',
        '--repos',
        'aico',
        '--json',
      ])
    );

    // Mark TASK-CORE-001-1 Done and Plan Completed
    runCli(['task-status', '--plan', feat.planPath, '--task', 'TASK-CORE-001-1', '--status', 'Done']);
    assert.ok(fs.readFileSync(feat.planPath, 'utf8').includes('status: "Completed"'));

    // Amend plan with a new task -> assigns TASK-CORE-001-2, reopens plan/spec/epic to In Progress, adds single Amendment Log
    const amendOut = runCli([
      'plan-amend',
      '--plan',
      feat.planPath,
      '--title',
      'Token Refresh Remediation',
      '--addresses',
      'REQ-001',
      '--seam',
      'tests/auth_test.rs::test_refresh',
      '--delivers',
      'Refresh endpoint;Token rotation',
      '--rationale',
      'Handle expired tokens gracefully',
      '--json',
    ]);
    const amendJson = JSON.parse(amendOut);
    assert.equal(amendJson.taskId, 'TASK-CORE-001-2');

    // Amend a second time to ensure no duplicate "## 3. Amendment Log" header is created
    runCli([
      'plan-amend',
      '--plan',
      feat.planPath,
      '--title',
      'Audit Logging Hook',
      '--addresses',
      'REQ-001',
      '--seam',
      'tests/auth_test.rs::test_audit',
      '--delivers',
      'Audit hook',
      '--blocked-by',
      'TASK-CORE-001-2',
      '--rationale',
      'Add security logging',
    ]);

    const updatedPlan = fs.readFileSync(feat.planPath, 'utf8');
    assert.ok(updatedPlan.includes('status: "In Progress"'));
    const amendmentHeaders = updatedPlan.match(/##\s*(\d+\.)?\s*Amendment Log/gi) || [];
    assert.equal(amendmentHeaders.length, 1);

    // Query Active Frontier -> Only TASK-CORE-001-2 is unblocked (TASK-CORE-001-3 is blocked by TASK-CORE-001-2)
    const frontierJson = JSON.parse(runCli(['frontier', '--plan', feat.planPath, '--json']));
    assert.equal(frontierJson.frontier.length, 1);
    assert.equal(frontierJson.frontier[0].id, 'TASK-CORE-001-2');

    // Introduce a circular dependency and verify frontier detects DAG cycle (REQ-012)
    const cyclicPlan = updatedPlan.replace(
      '- **TASK-CORE-001-2**: Token Refresh Remediation\n  - **Status**: Pending\n  - **Addresses**: `REQ-001`\n  - **Blocked by**: None',
      '- **TASK-CORE-001-2**: Token Refresh Remediation\n  - **Status**: Pending\n  - **Addresses**: `REQ-001`\n  - **Blocked by**: `TASK-CORE-001-3`'
    );
    fs.writeFileSync(feat.planPath, cyclicPlan, 'utf8');
    assert.throws(() => {
      runCli(['frontier', '--plan', feat.planPath]);
    });
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-001
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-002
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-009
// @verifies spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-012
test('test_verify_and_trace_tags', () => {
  const { tmpRoot, specsDir } = createTempSpecsWorkspace();
  try {
    const feat = JSON.parse(
      runCli([
        'scaffold-feature',
        '--specs-dir',
        specsDir,
        '--slug',
        'fast-trace',
        '--title',
        'Fast Trace',
        '--repos',
        'aico',
        '--derives-from',
        'ADR-0001',
        '--json',
      ])
    );

    // 1. Generate trace tags for spec/task (REQ-009)
    const tagsOut = runCli(['trace-tags', '--spec', feat.specPath, '--task', 'TASK-FAST-TRACE-001']);
    assert.ok(tagsOut.includes('// @verifies spec-ft-fast-trace::TASK-FAST-TRACE-001::REQ-001'));
    assert.ok(tagsOut.includes('// @implements spec-ft-fast-trace::TASK-FAST-TRACE-001::REQ-001'));

    // 2. Run unified `aico-cli.mjs verify` and legacy `verify-artifacts.mjs` wrapper
    const verifyOut = JSON.parse(runCli(['verify', specsDir, '--json']));
    assert.equal(verifyOut.summary.blueprintErrors, 0);
    assert.equal(verifyOut.summary.blueprintWarnings, 0);

    const legacyVerifyOut = JSON.parse(
      execFileSync(process.execPath, [VERIFY_SCRIPT_PATH, specsDir, '--json'], { encoding: 'utf8' })
    );
    assert.equal(legacyVerifyOut.summary.blueprintErrors, 0);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// @verifies spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-001
// @verifies spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-002
// @verifies spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-003
test('test_skills_documentation_references_cli', () => {
  const expectedSkillRefs = [
    ['aico-epic', 'scaffold-epic'],
    ['aico-feature', 'scaffold-feature'],
    ['aico-domain-modeling', 'scaffold-adr'],
    ['aico-domain-modeling', 'upsert-glossary'],
    ['aico-implementation', 'task-status'],
    ['aico-plan-amendment', 'plan-amend'],
    ['aico-planning', 'frontier'],
    ['aico-verify', 'aico-cli.mjs'],
    ['aico-deep-dive', 'query_lineage_graph'],
    ['aico-brainstorm', 'search_hybrid'],
  ];

  for (const [skillName, expectedToken] of expectedSkillRefs) {
    const skillFile = path.join(SKILLS_ROOT, skillName, 'SKILL.md');
    const content = fs.readFileSync(skillFile, 'utf8');
    assert.ok(
      content.includes(expectedToken),
      `Expected ${skillName}/SKILL.md to reference "${expectedToken}"`
    );
  }
});
