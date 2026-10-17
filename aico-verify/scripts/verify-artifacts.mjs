#!/usr/bin/env node

/**
 * verify-artifacts.mjs
 *
 * Wrapper delegating to the unified AICO CLI verification engine (`scripts/aico-cli.mjs verify`).
 */

import { runVerifyCli } from '../../scripts/aico-cli.mjs';

// @implements spec-ft-git-skills-traceability::TASK-GIT-004-2::REQ-003
// @implements spec-ft-git-skills-traceability::TASK-GIT-004-2::REQ-004
// @implements spec-ft-git-skills-traceability::TASK-GIT-004-2::REQ-005
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-002
const exitCode = runVerifyCli(process.argv.slice(2));
process.exit(exitCode);
