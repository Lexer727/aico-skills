#!/usr/bin/env node
import { getSkillsHarnessVersion } from './aico-cli.mjs';

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-002
try {
  console.log(getSkillsHarnessVersion());
} catch (err) {
  console.error('Failed to read version from plugin.json:', err.message);
  process.exit(1);
}
