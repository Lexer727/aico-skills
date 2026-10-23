import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_SUBAGENT_MODEL,
  ALLOWED_SUBAGENT_MODELS,
  resolveSubagentModel,
  formatSubagentRole,
  checkSeamDisjointness,
  planParallelSubagents,
} from '../aico-planning/scripts/subagent-model-router.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_ROOT = path.resolve(__dirname, '..');
const AGENTS_SKILLS_ROOT = path.resolve(__dirname, '../../../.agents/skills');

// @verifies spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-002
test('REQ-002: Parallel Subagent Execution protocol and model routing are documented across all 4 skills', () => {
  const skills = ['aico-planning', 'aico-implementation', 'aico-feature', 'aico-epic'];

  for (const skill of skills) {
    const codebaseSkillPath = path.join(SKILLS_ROOT, skill, 'SKILL.md');
    const agentSkillPath = path.join(AGENTS_SKILLS_ROOT, skill, 'SKILL.md');

    assert.ok(fs.existsSync(codebaseSkillPath), `Expected ${codebaseSkillPath} to exist`);
    assert.ok(fs.existsSync(agentSkillPath), `Expected ${agentSkillPath} to exist`);

    const codebaseContent = fs.readFileSync(codebaseSkillPath, 'utf8');
    const agentContent = fs.readFileSync(agentSkillPath, 'utf8');

    // Both codebase and .agents copies must be strictly in sync
    assert.equal(codebaseContent, agentContent, `Content mismatch between codebase and .agents for ${skill}`);

    // Verify invoke_subagent protocol documentation
    assert.ok(
      codebaseContent.includes('invoke_subagent'),
      `${skill}/SKILL.md must document invoke_subagent protocol`
    );

    // Verify TypeName: "self"
    assert.ok(
      codebaseContent.includes('"TypeName": "self"') || codebaseContent.includes('TypeName: "self"'),
      `${skill}/SKILL.md must document TypeName: "self"`
    );

    // Verify Seam Disjointness check
    assert.ok(
      codebaseContent.includes('Seam Disjointness Check') || codebaseContent.includes('disjoint'),
      `${skill}/SKILL.md must document Seam Disjointness check`
    );

    // Verify serialization rule for overlapping seams (REQ-004)
    assert.ok(
      codebaseContent.includes('serialize') || codebaseContent.includes('serialized'),
      `${skill}/SKILL.md must document serialization for overlapping seams`
    );

    // Verify model routing: flash default and Gemini 3.8 Flash
    assert.ok(
      codebaseContent.includes('Model: "flash"') || codebaseContent.includes('"Model": "flash"'),
      `${skill}/SKILL.md must document default Model: "flash"`
    );
    assert.ok(
      codebaseContent.includes('Gemini 3.8 Flash'),
      `${skill}/SKILL.md must reference Gemini 3.8 Flash`
    );

    // Verify model overrides: inherit / pro and Gemini 4 Argon High
    assert.ok(
      codebaseContent.includes('inherit') && codebaseContent.includes('pro'),
      `${skill}/SKILL.md must document inherit and pro model overrides`
    );
    assert.ok(
      codebaseContent.includes('Gemini 4 Argon High'),
      `${skill}/SKILL.md must reference Gemini 4 Argon High`
    );

    // Verify explicit role tags (REQ-006)
    assert.ok(
      codebaseContent.includes('(3.8 Flash High)'),
      `${skill}/SKILL.md must document (3.8 Flash High) role tag`
    );
    assert.ok(
      codebaseContent.includes('(4 Argon High)'),
      `${skill}/SKILL.md must document (4 Argon High) role tag`
    );

    // Verify atomic lock status update via aico-cli.mjs task-status
    assert.ok(
      codebaseContent.includes('aico-cli.mjs task-status'),
      `${skill}/SKILL.md must document aico-cli.mjs task-status`
    );
    assert.ok(
      codebaseContent.includes('.lock'),
      `${skill}/SKILL.md must document atomic lockfile synchronization`
    );
  }
});

// @verifies spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-003
test('REQ-003: Disjoint ready frontier tasks dispatch parallel subagents with user model overrides', () => {
  const readyTasks = [
    {
      id: 'TASK-001',
      seams: ['codebase/moduleA/test.mjs'],
      files: ['codebase/moduleA/index.mjs'],
    },
    {
      id: 'TASK-002',
      seams: ['codebase/moduleB/test.mjs'],
      files: ['codebase/moduleB/index.mjs'],
    },
  ];

  // User specifies an override for TASK-001 to 'inherit' (Gemini 4 Argon High), defaults TASK-002 to 'flash'
  const plan = planParallelSubagents(readyTasks, {
    'TASK-001': 'inherit',
  });

  assert.equal(plan.canParallel, true);
  assert.equal(plan.executionMode, 'parallel');
  assert.equal(plan.overlaps.length, 0);
  assert.equal(plan.subagents.length, 2);

  assert.deepEqual(plan.subagents[0], {
    taskId: 'TASK-001',
    role: 'Task Implementer (4 Argon High)',
    model: 'inherit',
    typeName: 'self',
    workspace: 'inherit',
  });

  assert.deepEqual(plan.subagents[1], {
    taskId: 'TASK-002',
    role: 'Task Implementer (3.8 Flash High)',
    model: 'flash',
    typeName: 'self',
    workspace: 'inherit',
  });

  // User specifies 'pro' for another task
  const proPlan = planParallelSubagents(readyTasks, {
    'TASK-001': 'pro',
    'TASK-002': 'pro',
  });
  assert.equal(proPlan.subagents[0].model, 'pro');
  assert.equal(proPlan.subagents[1].model, 'pro');
});

// @verifies spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-004
test('REQ-004: Tasks modifying overlapping files or verification seams are serialized', () => {
  const overlappingTasks = [
    {
      id: 'TASK-001',
      seams: ['codebase/common/test.mjs'],
      files: ['codebase/common/shared.mjs'],
    },
    {
      id: 'TASK-002',
      seams: ['codebase/common/test.mjs'],
      files: ['codebase/common/other.mjs'],
    },
  ];

  const seamCheck = checkSeamDisjointness(overlappingTasks);
  assert.equal(seamCheck.disjoint, false);
  assert.equal(seamCheck.overlaps.length, 1);
  assert.equal(seamCheck.overlaps[0].itemA, 'TASK-001');
  assert.equal(seamCheck.overlaps[0].itemB, 'TASK-002');
  assert.ok(seamCheck.overlaps[0].overlapping.includes('codebase/common/test.mjs'));

  const plan = planParallelSubagents(overlappingTasks);
  assert.equal(plan.canParallel, false);
  assert.equal(plan.executionMode, 'serial');
  assert.equal(plan.overlaps.length, 1);
});

// @verifies spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-006
test('REQ-006: Subagent model selection defaults to "flash" (Gemini 3.8 Flash)', () => {
  // Undefined override defaults to flash
  assert.equal(resolveSubagentModel(undefined), 'flash');
  // Null override defaults to flash
  assert.equal(resolveSubagentModel(null), 'flash');
  // Empty string defaults to flash
  assert.equal(resolveSubagentModel(''), 'flash');

  // Verify DEFAULT_SUBAGENT_MODEL constant
  assert.equal(DEFAULT_SUBAGENT_MODEL, 'flash');
  assert.ok(ALLOWED_SUBAGENT_MODELS.includes('flash'));
  assert.ok(ALLOWED_SUBAGENT_MODELS.includes('inherit'));
  assert.ok(ALLOWED_SUBAGENT_MODELS.includes('pro'));

  // Valid overrides resolve properly
  assert.equal(resolveSubagentModel('flash'), 'flash');
  assert.equal(resolveSubagentModel('inherit'), 'inherit');
  assert.equal(resolveSubagentModel('pro'), 'pro');
  assert.equal(resolveSubagentModel('FLASH'), 'flash');
  assert.equal(resolveSubagentModel('  inherit  '), 'inherit');

  // Invalid models throw an error
  assert.throws(
    () => resolveSubagentModel('invalid-model-name'),
    /Invalid subagent model "invalid-model-name"/
  );
});

// @verifies spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-006
test('REQ-006: formatSubagentRole formats explicit <Version> <Model> <Effort> tags', () => {
  // Default / flash -> (3.8 Flash High)
  assert.equal(formatSubagentRole('Task Implementer'), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer', null), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer', ''), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer', 'flash'), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer', '3.8 Flash'), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer', '3.8 Flash High'), 'Task Implementer (3.8 Flash High)');

  // 3.8 Flash Low
  assert.equal(formatSubagentRole('Task Implementer', '3.8 Flash Low'), 'Task Implementer (3.8 Flash Low)');

  // 3.8 Flash Medium
  assert.equal(formatSubagentRole('Task Implementer', '3.8 Flash Medium'), 'Task Implementer (3.8 Flash Medium)');

  // 4 Flash High
  assert.equal(formatSubagentRole('Task Implementer', '4 Flash High'), 'Task Implementer (4 Flash High)');

  // 4 Argon High / argon / inherit
  assert.equal(formatSubagentRole('Task Implementer', '4 Argon High'), 'Task Implementer (4 Argon High)');
  assert.equal(formatSubagentRole('Task Implementer', 'argon'), 'Task Implementer (4 Argon High)');
  assert.equal(formatSubagentRole('Task Implementer', 'inherit'), 'Task Implementer (4 Argon High)');

  // Replaces existing suffix in base role
  assert.equal(formatSubagentRole('Task Implementer (Flash)', 'flash'), 'Task Implementer (3.8 Flash High)');
  assert.equal(formatSubagentRole('Task Implementer (Argon High)', 'inherit'), 'Task Implementer (4 Argon High)');
  assert.equal(formatSubagentRole('Feature Task Implementer (Old)', '4 Flash High'), 'Feature Task Implementer (4 Flash High)');
  assert.equal(formatSubagentRole('Child Feature Lead', '3.8 Flash Low'), 'Child Feature Lead (3.8 Flash Low)');
});
