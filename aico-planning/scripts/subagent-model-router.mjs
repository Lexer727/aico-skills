// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-002
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-003
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-004
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-2::REQ-006

/**
 * subagent-model-router.mjs
 *
 * Helper utilities for parallel subagent execution and per-task model routing.
 * Enforces:
 * - Default model: 'flash' (Gemini 3.8 Flash High)
 * - Supported overrides: 'inherit' (e.g. Gemini 4 Argon High) or 'pro'
 * - Role tag format: explicit <Version> <Model> <Effort> tags:
 *     (3.8 Flash High) by default, (3.8 Flash Low), (3.8 Flash Medium),
 *     (4 Argon High) for inherit/argon, (4 Flash High) for future models.
 * - Seam disjointness check: serializes execution if tasks share overlapping files/seams
 */

export const DEFAULT_SUBAGENT_MODEL = 'flash';
export const ALLOWED_SUBAGENT_MODELS = Object.freeze(['flash', 'inherit', 'pro']);

/**
 * Formats a subagent Role title with explicit <Version> <Model> <Effort> suffix.
 * Examples:
 * - Default / 'flash' / '3.8 Flash' -> '<baseRole> (3.8 Flash High)'
 * - '3.8 Flash Low' -> '<baseRole> (3.8 Flash Low)'
 * - '3.8 Flash Medium' -> '<baseRole> (3.8 Flash Medium)'
 * - '4 Argon High' / 'argon' / 'inherit' -> '<baseRole> (4 Argon High)'
 * - '4 Flash High' -> '<baseRole> (4 Flash High)'
 *
 * @param {string} [baseRole='Task Implementer']
 * @param {string|null|undefined} [modelChoice]
 * @returns {string}
 */
export function formatSubagentRole(baseRole = 'Task Implementer', modelChoice) {
  const cleanBase = (baseRole ? String(baseRole).replace(/\s*\([^)]*\)$/, '').trim() : '') || 'Task Implementer';

  if (!modelChoice || String(modelChoice).trim() === '') {
    return `${cleanBase} (3.8 Flash High)`;
  }

  const raw = String(modelChoice).trim().replace(/^\((.*)\)$/, '$1').trim();
  const lower = raw.toLowerCase();

  if (lower === 'flash' || lower === 'default') {
    return `${cleanBase} (3.8 Flash High)`;
  }

  if (lower === 'inherit' || lower === 'argon') {
    return `${cleanBase} (4 Argon High)`;
  }

  // Regex matching <version> <family>( <effort>)?
  const match = raw.match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)(?:\s+(low|medium|high))?$/i);
  if (match) {
    const version = match[1];
    const family = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
    const effort = match[3]
      ? (match[3].charAt(0).toUpperCase() + match[3].slice(1).toLowerCase())
      : 'High';
    return `${cleanBase} (${version} ${family} ${effort})`;
  }

  if (lower === 'pro') {
    return `${cleanBase} (Pro High)`;
  }

  return `${cleanBase} (${raw})`;
}

/**
 * Resolves the model to pass to `invoke_subagent`.
 * Defaults to 'flash' (REQ-006) if userOverride is null/undefined/empty.
 * Supports 'flash', 'inherit', and 'pro' (REQ-003).
 *
 * @param {string|null|undefined} userOverride
 * @returns {'flash' | 'inherit' | 'pro'}
 */
export function resolveSubagentModel(userOverride) {
  if (userOverride === undefined || userOverride === null || userOverride === '') {
    return DEFAULT_SUBAGENT_MODEL;
  }
  const normalized = String(userOverride).trim().toLowerCase();
  if (ALLOWED_SUBAGENT_MODELS.includes(normalized)) {
    return normalized;
  }
  if (normalized.includes('flash')) {
    return 'flash';
  }
  if (normalized.includes('argon') || normalized === 'inherit') {
    return 'inherit';
  }
  if (normalized.includes('pro')) {
    return 'pro';
  }
  throw new Error(
    `Invalid subagent model "${userOverride}". Allowed models: ${ALLOWED_SUBAGENT_MODELS.join(', ')}`
  );
}

/**
 * Checks whether an array of tasks or features touch disjoint files / verification seams.
 *
 * @param {Array<{ id: string, seams?: string[], files?: string[], verificationSeam?: string }>} items
 * @returns {{ disjoint: boolean, overlaps: Array<{ itemA: string, itemB: string, overlapping: string[] }> }}
 */
export function checkSeamDisjointness(items) {
  if (!Array.isArray(items) || items.length <= 1) {
    return { disjoint: true, overlaps: [] };
  }

  const overlaps = [];

  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    const targetsA = new Set(
      [
        ...(itemA.seams || []),
        ...(itemA.files || []),
        ...(itemA.verificationSeam ? [itemA.verificationSeam] : []),
      ]
        .map(s => String(s).trim().toLowerCase())
        .filter(Boolean)
    );

    for (let j = i + 1; j < items.length; j++) {
      const itemB = items[j];
      const targetsB = new Set(
        [
          ...(itemB.seams || []),
          ...(itemB.files || []),
          ...(itemB.verificationSeam ? [itemB.verificationSeam] : []),
        ]
          .map(s => String(s).trim().toLowerCase())
          .filter(Boolean)
      );

      const shared = [];
      for (const target of targetsA) {
        if (targetsB.has(target)) {
          shared.push(target);
        }
      }

      if (shared.length > 0) {
        overlaps.push({
          itemA: itemA.id,
          itemB: itemB.id,
          overlapping: shared,
        });
      }
    }
  }

  return {
    disjoint: overlaps.length === 0,
    overlaps,
  };
}

/**
 * Plans subagent execution for a list of unblocked ready frontier tasks.
 * If seams are overlapping, enforces serial execution (REQ-004).
 * If seams are disjoint, routes tasks to parallel subagents with model resolution (REQ-003, REQ-006).
 *
 * @param {Array<{ id: string, seams?: string[], files?: string[], verificationSeam?: string, role?: string }>} readyTasks
 * @param {Record<string, string>} [userOverrides={}] Map of taskId -> model name
 * @param {string} [baseRole='Task Implementer']
 * @returns {{
 *   canParallel: boolean,
 *   executionMode: 'parallel' | 'serial',
 *   subagents: Array<{ taskId: string, role: string, model: string, typeName: string, workspace: string }>,
 *   overlaps: Array<{ itemA: string, itemB: string, overlapping: string[] }>
 * }}
 */
export function planParallelSubagents(readyTasks, userOverrides = {}, baseRole = 'Task Implementer') {
  if (!Array.isArray(readyTasks)) {
    throw new TypeError('readyTasks must be an array');
  }

  const { disjoint, overlaps } = checkSeamDisjointness(readyTasks);

  if (!disjoint) {
    // REQ-004: Serialize execution if overlapping seams exist
    return {
      canParallel: false,
      executionMode: 'serial',
      overlaps,
      subagents: readyTasks.map(task => ({
        taskId: task.id,
        role: formatSubagentRole(task.role || baseRole, userOverrides[task.id]),
        model: resolveSubagentModel(userOverrides[task.id]),
        typeName: 'self',
        workspace: 'inherit',
      })),
    };
  }

  // REQ-003, REQ-006: Parallel execution with resolved models
  return {
    canParallel: true,
    executionMode: 'parallel',
    overlaps: [],
    subagents: readyTasks.map(task => ({
      taskId: task.id,
      role: formatSubagentRole(task.role || baseRole, userOverrides[task.id]),
      model: resolveSubagentModel(userOverrides[task.id]),
      typeName: 'self',
      workspace: 'inherit',
    })),
  };
}
