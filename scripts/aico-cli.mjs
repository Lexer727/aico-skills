#!/usr/bin/env node

/**
 * aico-cli.mjs
 *
 * Unified zero-dependency deterministic CLI engine for AICO Spec-Driven Development (SDD).
 * Subcommands:
 *   - version
 *   - scaffold-epic
 *   - scaffold-feature
 *   - scaffold-adr
 *   - upsert-glossary
 *   - task-status
 *   - plan-amend
 *   - frontier
 *   - trace-tags
 *   - verify
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-001
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-002
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-001
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-002
// @implements spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-001
// @implements spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-002
// @implements spec-ft-tooling-skills-integration::TASK-TOOL-003-1::REQ-003
export function getSkillsHarnessVersion(customStartDir = __dirname) {
  const possiblePaths = [
    path.resolve(customStartDir, '../plugin.json'),
    path.resolve(customStartDir, '../../plugin.json'),
    path.resolve(process.env.USERPROFILE || '', '.gemini/config/plugins/aico-skills/plugin.json'),
    path.resolve(process.env.USERPROFILE || '', '.gemini/config/plugins/aico-skills/skills/plugin.json'),
    'd:/aico/codebase/aico-skills/plugin.json',
    path.resolve(process.cwd(), '.agents/skills/plugin.json'),
    path.resolve(customStartDir, '../VERSION'),
    path.resolve(customStartDir, '../../VERSION'),
    'd:/aico/codebase/aico-skills/VERSION',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        if (p.endsWith('.json')) {
          const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (manifest.version) return manifest.version.trim();
        } else {
          const v = fs.readFileSync(p, 'utf8').trim();
          if (v) return v;
        }
      } catch {}
    }
  }
  return '0.1.2';
}

function parseFlags(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      flags._.push(token);
    }
  }
  return flags;
}

export function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, rawBody: content, lineOffset: 0, hasFrontmatterOnLine1: false };
  }

  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { frontmatter: null, rawBody: content, lineOffset: 0, hasFrontmatterOnLine1: false };
  }

  const fmRaw = content.slice(4, endIdx).trim();
  const rawBody = content.slice(endIdx + 4).trimStart();
  const lineOffset = content.slice(0, endIdx + 4).split('\n').length;

  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      try {
        val = JSON.parse(val.replace(/'/g, '"'));
      } catch {
        val = val
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    } else if (val === 'null') {
      val = null;
    } else if (val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    } else if (!isNaN(Number(val)) && val !== '') {
      val = Number(val);
    }

    fm[key] = val;
  }

  return { frontmatter: fm, rawBody, lineOffset, hasFrontmatterOnLine1: true, fmRaw, endIdx };
}

function updateFrontmatterStatus(filePath, newStatus) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const endIdx = content.indexOf('\n---', 3);
  if (!content.startsWith('---') || endIdx === -1) return;
  const fmSection = content.slice(0, endIdx + 4);
  const updatedFm = fmSection.replace(/\nstatus:\s*[^\r\n]+/, `\nstatus: "${newStatus}"`);
  if (updatedFm !== fmSection) {
    fs.writeFileSync(filePath, updatedFm + content.slice(endIdx + 4), 'utf8');
  }
}

// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-1::REQ-001
export function getKnownProjectRepositories(specsDir) {
  const manifestPath = path.resolve(specsDir, '.aico-project.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const repos = new Set();
      if (manifest.id) {
        repos.add(manifest.id);
      }
      if (Array.isArray(manifest.repositories)) {
        for (const r of manifest.repositories) {
          if (r.id) repos.add(r.id);
        }
      }
      if (repos.size > 0) return repos;
      if (manifest.name) {
        return new Set([manifest.name, `${manifest.name}-specs`, `${manifest.name}-skills`]);
      }
    } catch {}
  }
  return null;
}

function resolveAdrMarkdownLink(specsDir, fromFileDir, derivesFromList) {
  const adrDir = path.join(specsDir, 'adr');
  if (!fs.existsSync(adrDir)) return 'None.';

  const adrFiles = fs.readdirSync(adrDir).filter(f => f.endsWith('.md')).sort();
  if (adrFiles.length === 0) return 'None.';

  const requestedAdrs = (derivesFromList || []).filter(d => /^adr-\d+/i.test(d));
  const links = [];

  if (requestedAdrs.length > 0) {
    for (const reqAdr of requestedAdrs) {
      const numMatch = reqAdr.match(/\d+/);
      const numPrefix = numMatch ? numMatch[0].padStart(4, '0') : '';
      const found = adrFiles.find(f => f.startsWith(numPrefix)) || adrFiles[0];
      const rel = path.relative(fromFileDir, path.join(adrDir, found)).replace(/\\/g, '/');
      links.push(`[${reqAdr.toUpperCase()}](${rel})`);
    }
  } else {
    const found = adrFiles[adrFiles.length - 1];
    const numMatch = found.match(/^(\d{4})/);
    const label = numMatch ? `ADR-${numMatch[1]}` : found.replace(/\.md$/, '');
    const rel = path.relative(fromFileDir, path.join(adrDir, found)).replace(/\\/g, '/');
    links.push(`[${label}](${rel})`);
  }

  return `None. Ratified in ${links.join(' and ')}.`;
}

function formatYamlArray(arr) {
  if (!arr || arr.length === 0) return '[]';
  return `[${arr.map(s => `"${s}"`).join(', ')}]`;
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-003
export function scaffoldEpic(opts) {
  const specsDir = path.resolve(opts.specsDir || process.cwd());
  const rawId = String(opts.id || '').trim().toLowerCase().replace(/^ec-/, '');
  if (!rawId) {
    throw new Error('Missing required --id <short_id> for scaffold-epic');
  }
  const epicId = `ec-${rawId}`;
  const title = opts.title || `Epic ${epicId}`;
  const status = opts.status || 'Draft';
  const derivesList = opts.derivesFrom
    ? String(opts.derivesFrom).split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const skillsVer = getSkillsHarnessVersion();
  const nowIso = new Date().toISOString();

  const epicDir = path.join(specsDir, 'epics', epicId);
  const featuresDir = path.join(epicDir, 'features');
  fs.mkdirSync(featuresDir, { recursive: true });

  const brainPath = path.join(epicDir, `brain-${epicId}.md`);
  if (fs.existsSync(brainPath) && !opts.overwrite) {
    throw new Error(`Epic brainstorm already exists at ${brainPath}`);
  }

  const adrCitation = resolveAdrMarkdownLink(specsDir, epicDir, derivesList);
  const derivesJson = formatYamlArray(derivesList);

  const brainContent = [
    '---',
    `id: brain-${epicId}`,
    'type: brainstorm',
    `aico_skills_version: "${skillsVer}"`,
    `epic: "${epicId}"`,
    `title: "${title}"`,
    `status: "${status}"`,
    `derives_from: ${derivesJson}`,
    `created_at: "${nowIso}"`,
    '---',
    '',
    `# Brainstorm: ${title}`,
    '',
    '## 1. Executive Summary & Problem Statement',
    '',
    `${title} overarching problem framing and architectural context.`,
    '',
    '---',
    '',
    '## 2. Core Enhancements & Decisions',
    '',
    `- Architectural alignment: ${adrCitation}`,
    '',
    '---',
    '',
    '## 3. Epic Decomposition (Child Features)',
    '',
    '- Decomposed child features live under `features/ft-*`.',
    '',
  ].join('\n');

  fs.writeFileSync(brainPath, brainContent, 'utf8');

  return {
    epicId,
    epicDir,
    featuresDir,
    brainPath,
  };
}

function computeNextFeatureOrder(containerDir) {
  if (!fs.existsSync(containerDir)) return 1;
  let maxOrder = 0;
  for (const entry of fs.readdirSync(containerDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const featDir = path.join(containerDir, entry.name);
    for (const f of fs.readdirSync(featDir)) {
      if (f.startsWith('spec-') && f.endsWith('.md')) {
        const { frontmatter } = parseFrontmatter(fs.readFileSync(path.join(featDir, f), 'utf8'));
        if (frontmatter && typeof frontmatter.order === 'number' && frontmatter.order > maxOrder) {
          maxOrder = frontmatter.order;
        }
      }
    }
  }
  return maxOrder + 1;
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-004
export function scaffoldFeature(opts) {
  const specsDir = path.resolve(opts.specsDir || process.cwd());
  const rawSlug = String(opts.slug || '').trim().toLowerCase().replace(/^ft-/, '');
  if (!rawSlug) {
    throw new Error('Missing required --slug <feature-slug> for scaffold-feature');
  }

  let epicId = null;
  let epicShort = null;
  if (opts.epic) {
    epicShort = String(opts.epic).trim().toLowerCase().replace(/^ec-/, '');
    epicId = `ec-${epicShort}`;
  }

  let featureSlug;
  let containerDir;
  if (epicId) {
    const prefixWithShort = `${epicShort}-`;
    const suffix = rawSlug.startsWith(prefixWithShort) ? rawSlug.slice(prefixWithShort.length) : rawSlug;
    featureSlug = `ft-${epicShort}-${suffix}`;
    containerDir = path.join(specsDir, 'epics', epicId, 'features');
  } else {
    featureSlug = `ft-${rawSlug}`;
    containerDir = path.join(specsDir, 'features');
  }

  fs.mkdirSync(containerDir, { recursive: true });
  const order = opts.order ? Number(opts.order) : computeNextFeatureOrder(containerDir);
  const featureDir = path.join(containerDir, featureSlug);
  fs.mkdirSync(featureDir, { recursive: true });

  const knownRepos = getKnownProjectRepositories(specsDir);
  const reposList = opts.repos
    ? String(opts.repos).split(',').map(s => s.trim()).filter(Boolean)
    : ['aico'];

  if (knownRepos) {
    for (const r of reposList) {
      if (!knownRepos.has(r)) {
        throw new Error(`Repository "${r}" is not registered in .aico-project.json`);
      }
    }
  }

  const derivesList = opts.derivesFrom
    ? String(opts.derivesFrom).split(',').map(s => s.trim()).filter(Boolean)
    : epicId
      ? [`brain-${epicId}`]
      : [];

  const title = opts.title || featureSlug;
  const skillsVer = getSkillsHarnessVersion();
  const nowIso = new Date().toISOString();
  const epicYaml = epicId ? `"${epicId}"` : 'null';
  const adrClarification = resolveAdrMarkdownLink(specsDir, featureDir, derivesList);

  const specId = `spec-${featureSlug}`;
  const planId = `plan-${featureSlug}`;
  const specPath = path.join(featureDir, `${specId}.md`);
  const planPath = path.join(featureDir, `${planId}.md`);

  const taskPrefix = (epicShort || rawSlug).toUpperCase().replace(/[^A-Z0-9]/g, '-');
  const orderPadded = String(order).padStart(3, '0');
  const starterTaskId = epicShort ? `TASK-${taskPrefix}-${orderPadded}-1` : `TASK-${taskPrefix}-001`;

  const specContent = [
    '---',
    `id: ${specId}`,
    'type: spec',
    `aico_skills_version: "${skillsVer}"`,
    `epic: ${epicYaml}`,
    `order: ${order}`,
    `title: "${title}"`,
    'status: "Draft"',
    `derives_from: ${formatYamlArray(derivesList)}`,
    `created_at: "${nowIso}"`,
    '---',
    '',
    `# Feature Specification: ${title}`,
    '',
    '## 1. Problem Statement & User Value',
    '',
    `${title} problem statement and measurable engineering value.`,
    '',
    '---',
    '',
    '## In-Scope',
    `- Core capabilities for ${title}.`,
    '',
    '---',
    '',
    '## 2. User Stories',
    '',
    `1. **US-01** (Priority: P1): As a developer, I want ${title}, so that the capability is verified end-to-end.`,
    '   - *Independent Test*: Verify primary contract seam passes.',
    '',
    '---',
    '',
    '## 3. Functional Requirements (EARS)',
    '',
    '### Ubiquitous Requirements',
    `- **REQ-001**: The system shall provide ${title}.`,
    '',
    '---',
    '',
    '## 4. Designated Public Test Seams',
    '',
    '### Primary Seams:',
    `1. **Primary Seam (\`${featureSlug}\`)**:`,
    '   - Signature: `pub fn execute()`',
    '   - Seam Test: `tests/seam_test.rs::test_contract`',
    '',
    '---',
    '',
    '## Out-of-Scope',
    '- Unrelated subsystem modifications.',
    '',
    '---',
    '',
    '## 5. Open Clarifications',
    '',
    adrClarification,
    '',
  ].join('\n');

  const planContent = [
    '---',
    `id: ${planId}`,
    'type: plan',
    `aico_skills_version: "${skillsVer}"`,
    `epic: ${epicYaml}`,
    `order: ${order}`,
    `title: "${title} Implementation Plan"`,
    'status: "Draft"',
    `repositories: ${formatYamlArray(reposList)}`,
    `derives_from: ["${specId}"]`,
    `created_at: "${nowIso}"`,
    '---',
    '',
    `# Implementation Plan: ${title}`,
    '',
    '## 1. Technical Architecture & Decisions',
    '',
    `- Target repositories: ${reposList.join(', ')}.`,
    '',
    '---',
    '',
    '## 2. Task Graph (DAG)',
    '',
    '### Phase 1: Core Vertical Tracer Bullet',
    '',
    `- **${starterTaskId}**: Implement ${title}`,
    '  - **Status**: Pending',
    '  - **Addresses**: `REQ-001`',
    '  - **Blocked by**: None (Can start immediately)',
    '  - **What it delivers**:',
    `    - Primary implementation and contract verification for ${title}.`,
    '  - **Verification Seam**: `tests/seam_test.rs::test_contract`',
    '',
  ].join('\n');

  fs.writeFileSync(specPath, specContent, 'utf8');
  fs.writeFileSync(planPath, planContent, 'utf8');

  let divePath = null;
  if (opts.withDive) {
    divePath = path.join(featureDir, `dive-${featureSlug}.md`);
    const diveContent = [
      '---',
      `id: dive-${featureSlug}`,
      'type: deep_dive',
      `aico_skills_version: "${skillsVer}"`,
      `epic: ${epicYaml}`,
      `order: ${order}`,
      `title: "${title} Deep Dive"`,
      'status: "Draft"',
      `derives_from: ${formatYamlArray(derivesList)}`,
      `created_at: "${nowIso}"`,
      '---',
      '',
      `# Deep Dive: ${title}`,
      '',
      '## 1. System Boundary & Blast Radius',
      '- Boundary analysis and public test seams.',
      '',
    ].join('\n');
    fs.writeFileSync(divePath, diveContent, 'utf8');
  }

  let brainPath = null;
  if (opts.withBrain) {
    brainPath = path.join(featureDir, `brain-${featureSlug}.md`);
    const brainContent = [
      '---',
      `id: brain-${featureSlug}`,
      'type: brainstorm',
      `aico_skills_version: "${skillsVer}"`,
      `epic: ${epicYaml}`,
      `order: ${order}`,
      `title: "${title} Brainstorm"`,
      'status: "Draft"',
      `derives_from: ${formatYamlArray(derivesList)}`,
      `created_at: "${nowIso}"`,
      '---',
      '',
      `# Brainstorm: ${title}`,
      '',
      '## 1. Problem Framing & Trade-offs',
      '- Candidate approaches and rationale.',
      '',
    ].join('\n');
    fs.writeFileSync(brainPath, brainContent, 'utf8');
  }

  return {
    featureSlug,
    epicId,
    order,
    featureDir,
    specPath,
    planPath,
    divePath,
    brainPath,
  };
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-005
export function scaffoldAdr(opts) {
  const specsDir = path.resolve(opts.specsDir || process.cwd());
  const rawSlug = String(opts.slug || '').trim().toLowerCase().replace(/^\d+-/, '');
  if (!rawSlug) {
    throw new Error('Missing required --slug <adr-slug> for scaffold-adr');
  }
  const title = opts.title || rawSlug;
  const adrDir = path.join(specsDir, 'adr');
  fs.mkdirSync(adrDir, { recursive: true });

  let maxNum = 0;
  for (const f of fs.readdirSync(adrDir)) {
    const m = f.match(/^(\d{4})-/);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  const nextNum = String(maxNum + 1).padStart(4, '0');
  const adrId = `adr-${nextNum}`;
  const fileName = `${nextNum}-${rawSlug}.md`;
  const adrPath = path.join(adrDir, fileName);
  const skillsVer = getSkillsHarnessVersion();
  const nowIso = new Date().toISOString();

  const content = [
    '---',
    `id: ${adrId}`,
    'type: adr',
    `aico_skills_version: "${skillsVer}"`,
    `title: "${title}"`,
    'status: "Proposed"',
    'derives_from: []',
    `created_at: "${nowIso}"`,
    '---',
    '',
    `# ADR-${nextNum}: ${title}`,
    '',
    '## Context & Problem Statement',
    '',
    `${title} architectural context.`,
    '',
    '## Decision Drivers',
    '',
    '- Determinism and maintainability.',
    '',
    '## Considered Options',
    '',
    '1. **Option A (Chosen)**: Primary approach.',
    '2. **Option B**: Alternative approach.',
    '',
    '## Decision Outcome',
    '',
    'Chosen option: **Option A**.',
    '',
  ].join('\n');

  fs.writeFileSync(adrPath, content, 'utf8');
  return { adrId, number: nextNum, path: adrPath };
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-1::REQ-005
export function upsertGlossary(opts) {
  const specsDir = path.resolve(opts.specsDir || process.cwd());
  const term = String(opts.term || '').trim();
  const definition = String(opts.definition || '').trim();
  if (!term || !definition) {
    throw new Error('upsert-glossary requires --term and --definition');
  }
  const synonyms = opts.synonyms || 'None';
  const example = opts.example || term;
  const related = opts.related || 'None';

  const glossaryPath = path.join(specsDir, 'glossary.md');
  if (!fs.existsSync(glossaryPath)) {
    throw new Error(`Glossary file not found at ${glossaryPath}`);
  }

  let content = fs.readFileSync(glossaryPath, 'utf8');
  const block = [
    `### ${term}`,
    `- **Definition**: ${definition}`,
    `- **Synonyms (Avoid)**: ${synonyms}.`,
    `- **Example**: \`${example}\`.`,
    `- **Related Terms**: ${related}.`,
    '',
    '---',
    '',
  ].join('\n');

  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingRegex = new RegExp(`###\\s+${escapedTerm}\\r?\\n[\\s\\S]*?(?:\\r?\\n---\\r?\\n|$)`, 'i');
  if (existingRegex.test(content)) {
    content = content.replace(existingRegex, block);
  } else {
    content = content.trimEnd() + '\n\n' + block;
  }

  fs.writeFileSync(glossaryPath, content, 'utf8');
  return { glossaryPath, term };
}

function parsePlanTasksDetailed(content) {
  const taskRegex = /-\s+\*\*(TASK-[A-Za-z0-9\-]+)\*\*:\s*([^\n\r]+)/g;
  const matches = [];
  let m;
  while ((m = taskRegex.exec(content)) !== null) {
    matches.push({ id: m[1], title: m[2].trim(), startIdx: m.index });
  }

  const tasks = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const rest = content.slice(cur.startIdx);
    const nextTaskOffset = i + 1 < matches.length ? matches[i + 1].startIdx - cur.startIdx : rest.length;
    const nextSectionMatch = rest.slice(1).match(/\n---\r?\n|\n##\s+/);
    const nextSectionOffset = nextSectionMatch ? nextSectionMatch.index + 1 : rest.length;
    const blockEnd = Math.min(nextTaskOffset, nextSectionOffset);
    const block = rest.slice(0, blockEnd);

    const statusMatch = block.match(/\*\*Status\*\*:\s*([^\n\r]+)/);
    const addressesMatch = block.match(/\*\*Addresses\*\*:\s*([^\n\r]+)/);
    const blockedByMatch = block.match(/\*\*Blocked by\*\*:\s*([^\n\r]+)/);
    const seamMatch = block.match(/\*\*Verification Seam\*\*:\s*`?([^`\n\r]+)`?/);

    const statusRaw = statusMatch ? statusMatch[1].replace(/#.*$/, '').trim() : 'Unknown';
    const addresses = addressesMatch ? addressesMatch[1].match(/REQ(?:-[A-Za-z0-9]+)?-\d{3,4}/g) || [] : [];
    const blockedByRaw = blockedByMatch ? blockedByMatch[1].trim() : 'None';
    const blockers = /^none\b/i.test(blockedByRaw)
      ? []
      : blockedByRaw.match(/TASK-[A-Za-z0-9\-]+/g) || [];

    tasks.push({
      id: cur.id,
      title: cur.title,
      status: statusRaw,
      addresses,
      blockers,
      seam: seamMatch ? seamMatch[1].trim() : null,
      startIdx: cur.startIdx,
      endIdx: cur.startIdx + blockEnd,
      block,
    });
  }
  return tasks;
}

function findCodeFiles(dir, ignoreDirs = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.aico'])) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.scratch') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) walk(full);
      } else if (entry.isFile() && /\.(rs|ts|tsx|js|jsx|mjs|py|sh)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-1::REQ-001
export function resolveAdditionalCodeRoots(codeDir, specsDir = null) {
  const roots = [path.resolve(codeDir)];
  const candidateManifests = [];
  if (specsDir) candidateManifests.push(path.resolve(specsDir, '.aico-project.json'));
  candidateManifests.push(path.resolve(codeDir, '../../specs/aico-specs/.aico-project.json'));
  candidateManifests.push(path.resolve(codeDir, '../specs/aico-specs/.aico-project.json'));
  candidateManifests.push(path.resolve(codeDir, '../../aico-specs/.aico-project.json'));
  candidateManifests.push(path.resolve(codeDir, '../aico-specs/.aico-project.json'));

  for (const mp of candidateManifests) {
    if (fs.existsSync(mp)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'));
        const mDir = path.dirname(mp);
        if (Array.isArray(manifest.repositories)) {
          for (const r of manifest.repositories) {
            if (r.type === 'codebase' || r.type === 'skills') {
              const relPath = r.path || `../codebase/${r.id}`;
              const absRepo = path.resolve(mDir, relPath);
              if (fs.existsSync(absRepo) && !roots.includes(absRepo)) {
                roots.push(absRepo);
              }
            }
          }
        }
      } catch {}
      break;
    }
  }
  return roots;
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-011
function verifyTaskCompletionGate(planPath, task, frontmatter, codeDir) {
  const resolvedCodeDir = path.resolve(codeDir);
  const codeRoots = resolveAdditionalCodeRoots(resolvedCodeDir);

  if (task.seam) {
    const rawSeamFile = task.seam.split('::')[0].trim();
    const strippedSeamFile = rawSeamFile.replace(/^codebase\/[^/]+\//, '');
    const existsInAny = codeRoots.some(
      r => fs.existsSync(path.resolve(r, rawSeamFile)) || fs.existsSync(path.resolve(r, strippedSeamFile))
    );
    if (!existsInAny) {
      throw new Error(
        `TaskCompletionGateViolation: Verification seam file "${rawSeamFile}" for ${task.id} does not exist at ${path.resolve(resolvedCodeDir, rawSeamFile)}`
      );
    }
  }

  if (task.addresses.length > 0) {
    const specId =
      Array.isArray(frontmatter?.derives_from) && frontmatter.derives_from.length > 0
        ? frontmatter.derives_from[0]
        : String(frontmatter?.id || path.basename(planPath, '.md')).replace(/^plan-/, 'spec-');

    const files = codeRoots.flatMap(r => findCodeFiles(r));
    const verifiedReqs = new Set();
    const implementedReqs = new Set();

    const verifiesRe = /(?:\/\/|#|\/\*|\{\/\*)\s*@verifies\s+([A-Za-z0-9\-_]+)::(?:TASK-[A-Za-z0-9\-_]+::)?(REQ(?:-[A-Za-z0-9]+)?-\d{3,4})/g;
    const implementsRe = /(?:\/\/|#|\/\*|\{\/\*)\s*@implements\s+([A-Za-z0-9\-_]+)::(?:TASK-[A-Za-z0-9\-_]+::)?(REQ(?:-[A-Za-z0-9]+)?-\d{3,4})/g;

    for (const file of files) {
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      let m;
      while ((m = verifiesRe.exec(text)) !== null) {
        const sId = m[1].startsWith('spec-') ? m[1] : `spec-${m[1]}`;
        if (sId === specId) verifiedReqs.add(m[2]);
      }
      while ((m = implementsRe.exec(text)) !== null) {
        const sId = m[1].startsWith('spec-') ? m[1] : `spec-${m[1]}`;
        if (sId === specId) implementedReqs.add(m[2]);
      }
    }

    for (const reqId of task.addresses) {
      if (!verifiedReqs.has(reqId)) {
        throw new Error(`TaskCompletionGateViolation: Requirement ${specId}::${reqId} has no @verifies annotation in ${resolvedCodeDir}`);
      }
      if (!implementedReqs.has(reqId)) {
        throw new Error(`TaskCompletionGateViolation: Requirement ${specId}::${reqId} has no @implements annotation in ${resolvedCodeDir}`);
      }
    }
  }
}

// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-1::REQ-001
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-1::REQ-005
export function withFileLock(targetPath, fn, options = {}) {
  const lockPath = `${path.resolve(targetPath)}.lock`;
  const staleMs = options.staleMs ?? 10000;
  const timeoutMs = options.timeoutMs ?? 5000;
  const startTime = Date.now();
  const waitBuffer = new Int32Array(new SharedArrayBuffer(4));

  while (true) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }), 'utf8');
      } finally {
        fs.closeSync(fd);
      }
      break;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > staleMs) {
            try {
              fs.unlinkSync(lockPath);
            } catch {}
            continue;
          }
        } catch {
          continue;
        }
        if (Date.now() - startTime >= timeoutMs) {
          throw new Error(`Timed out waiting to acquire lock: ${lockPath}`);
        }
        const retryDelayMs = 15 + Math.floor(Math.random() * 16);
        Atomics.wait(waitBuffer, 0, 0, retryDelayMs);
      } else {
        throw err;
      }
    }
  }

  try {
    return fn();
  } finally {
    try {
      fs.unlinkSync(lockPath);
    } catch {}
  }
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-006
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-010
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-2::REQ-011
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-1::REQ-001
// @implements spec-ft-specs-parallel-subagent-execution::TASK-SPECS-007-1::REQ-005
export function setTaskStatus(opts) {
  const planPath = path.resolve(opts.plan || '');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Plan file not found: ${planPath}`);
  }

  const validStatuses = new Set(['Pending', 'In Progress', 'Done', 'Blocked', 'Skipped/Canceled', 'Rewritten']);
  const newStatus = String(opts.status || '').trim();
  if (!validStatuses.has(newStatus)) {
    throw new Error(`Invalid task status "${newStatus}". Must be one of: ${Array.from(validStatuses).join(', ')}`);
  }

  if (newStatus === 'Skipped/Canceled' && !opts.reason) {
    throw new Error('ADR-0009 violation: Transitioning to "Skipped/Canceled" requires --reason "<justification>"');
  }
  if (newStatus === 'Rewritten' && (!opts.reason || !opts.rewriteTarget)) {
    throw new Error(
      'ADR-0009 violation: Transitioning to "Rewritten" requires both --reason "<justification>" and --rewrite-target "<TASK-ID>"'
    );
  }

  return withFileLock(planPath, () => {
    let content = fs.readFileSync(planPath, 'utf8');
    const { frontmatter } = parseFrontmatter(content);
    let tasks = parsePlanTasksDetailed(content);
    const targetTask = tasks.find(t => t.id === opts.task);
    if (!targetTask) {
      throw new Error(`Task "${opts.task}" not found in ${planPath}`);
    }

    if (newStatus === 'Done' && opts.codeDir && !opts.skipGate) {
      verifyTaskCompletionGate(planPath, targetTask, frontmatter, opts.codeDir);
    }

    // Update the target task block
    let updatedBlock = targetTask.block.replace(/(\*\*Status\*\*:\s*)([^\n\r]+)/, `$1${newStatus}`);
    if (opts.reason) {
      if (/\*\*Reason\*\*:\s*[^\n\r]+/.test(updatedBlock)) {
        updatedBlock = updatedBlock.replace(/(\*\*Reason\*\*:\s*)([^\n\r]+)/, `$1${opts.reason}`);
      } else {
        updatedBlock = updatedBlock.replace(
          /(\*\*Status\*\*:\s*[^\n\r]+)/,
          `$1\n  - **Reason**: ${opts.reason}`
        );
      }
    }
    if (opts.rewriteTarget) {
      if (/\*\*Rewrite Target\*\*:\s*[^\n\r]+/.test(updatedBlock)) {
        updatedBlock = updatedBlock.replace(/(\*\*Rewrite Target\*\*:\s*)([^\n\r]+)/, `$1\`${opts.rewriteTarget}\``);
      } else {
        const anchor = opts.reason ? /(\*\*Reason\*\*:\s*[^\n\r]+)/ : /(\*\*Status\*\*:\s*[^\n\r]+)/;
        updatedBlock = updatedBlock.replace(anchor, `$1\n  - **Rewrite Target**: \`${opts.rewriteTarget}\``);
      }
    }

    content = content.slice(0, targetTask.startIdx) + updatedBlock + content.slice(targetTask.endIdx);

    // Re-parse tasks to auto-unblock any Blocked tasks whose blockers are now all Done
    tasks = parsePlanTasksDetailed(content);
    const doneSet = new Set(
      tasks.filter(t => ['Done', 'Skipped/Canceled', 'Rewritten'].includes(t.status)).map(t => t.id)
    );
    const unblockedTasks = [];

    for (let i = tasks.length - 1; i >= 0; i--) {
      const t = tasks[i];
      if (t.status === 'Blocked' && t.blockers.length > 0 && t.blockers.every(b => doneSet.has(b))) {
        const newBlock = t.block.replace(/(\*\*Status\*\*:\s*)Blocked/, '$1Pending');
        content = content.slice(0, t.startIdx) + newBlock + content.slice(t.endIdx);
        unblockedTasks.unshift(t.id);
      }
    }

    fs.writeFileSync(planPath, content, 'utf8');

    // Re-parse for status roll-up
    tasks = parsePlanTasksDetailed(content);
    const terminalStates = new Set(['Done', 'Skipped/Canceled', 'Rewritten']);
    const allTerminal = tasks.length > 0 && tasks.every(t => terminalStates.has(t.status));
    const anyStarted = tasks.some(t => t.status === 'In Progress' || terminalStates.has(t.status));

    const planDir = path.dirname(planPath);
    const specFile = fs.readdirSync(planDir).find(f => f.startsWith('spec-') && f.endsWith('.md'));
    const specPath = specFile ? path.join(planDir, specFile) : null;

    let rolledUpStatus = frontmatter?.status || 'Draft';
    if (allTerminal) {
      rolledUpStatus = 'Completed';
      updateFrontmatterStatus(planPath, 'Completed');
      if (specPath) updateFrontmatterStatus(specPath, 'Completed');
    } else if (anyStarted) {
      rolledUpStatus = 'In Progress';
      updateFrontmatterStatus(planPath, 'In Progress');
      if (specPath) updateFrontmatterStatus(specPath, 'In Progress');
    }

    // Check parent epic brainstorm roll-up if epic is present
    if (frontmatter?.epic) {
      const epicDir = path.resolve(planDir, '../..');
      const brainPath = path.join(epicDir, `brain-${frontmatter.epic}.md`);
      const featuresDir = path.join(epicDir, 'features');
      if (fs.existsSync(brainPath) && fs.existsSync(featuresDir)) {
        const siblingPlans = [];
        for (const entry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const fDir = path.join(featuresDir, entry.name);
          for (const f of fs.readdirSync(fDir)) {
            if (f.startsWith('plan-') && f.endsWith('.md')) {
              siblingPlans.push(path.join(fDir, f));
            }
          }
        }
        const allPlansCompleted =
          siblingPlans.length > 0 &&
          siblingPlans.every(p => {
            const { frontmatter: pFm } = parseFrontmatter(fs.readFileSync(p, 'utf8'));
            return pFm?.status === 'Completed';
          });
        if (allPlansCompleted) {
          updateFrontmatterStatus(brainPath, 'Completed');
        } else if (anyStarted) {
          updateFrontmatterStatus(brainPath, 'In Progress');
        }
      }
    }

    return {
      planPath,
      taskId: opts.task,
      status: newStatus,
      unblockedTasks,
      planStatus: rolledUpStatus,
    };
  });
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-007
export function amendPlan(opts) {
  const planPath = path.resolve(opts.plan || '');
  if (!fs.existsSync(planPath)) {
    throw new Error(`Plan file not found: ${planPath}`);
  }
  const title = String(opts.title || '').trim();
  const addressesRaw = String(opts.addresses || '').trim();
  const seam = String(opts.seam || '').trim();
  const rationale = String(opts.rationale || 'Amended task graph').trim();
  if (!title || !addressesRaw || !seam) {
    throw new Error('plan-amend requires --title, --addresses, and --seam');
  }

  return withFileLock(planPath, () => {
    let content = fs.readFileSync(planPath, 'utf8');
    const { frontmatter } = parseFrontmatter(content);
    const tasks = parsePlanTasksDetailed(content);

    // Determine next sequential TASK ID
    let nextTaskId = opts.taskId;
    if (!nextTaskId) {
      if (tasks.length > 0) {
        const lastId = tasks[tasks.length - 1].id;
        const m = lastId.match(/^(TASK-[A-Za-z0-9\-]+-)(\d+)$/);
        if (m) {
          const prefix = m[1];
          const padLen = m[2].length;
          const maxSeq = Math.max(
            ...tasks.map(t => {
              const tm = t.id.match(/^(?:TASK-[A-Za-z0-9\-]+-)(\d+)$/);
              return tm ? Number(tm[1]) : 0;
            })
          );
          nextTaskId = `${prefix}${String(maxSeq + 1).padStart(padLen, '0')}`;
        } else {
          nextTaskId = `${lastId}-2`;
        }
      } else {
        nextTaskId = 'TASK-AMEND-001';
      }
    }

    const formattedAddresses = addressesRaw
      .split(',')
      .map(s => `\`${s.trim().replace(/^`|`$/g, '')}\``)
      .join(', ');
    const blockedBy = opts.blockedBy
      ? String(opts.blockedBy)
          .split(',')
          .map(s => `\`${s.trim().replace(/^`|`$/g, '')}\``)
          .join(', ')
      : 'None (Can start immediately)';
    const status = opts.blockedBy && !/^none$/i.test(opts.blockedBy) ? 'Blocked' : 'Pending';
    const deliversList = opts.delivers
      ? String(opts.delivers)
          .split(';')
          .map(s => s.trim())
          .filter(Boolean)
      : [`Implements ${title}`];

    const taskBlock = [
      `- **${nextTaskId}**: ${title}`,
      `  - **Status**: ${status}`,
      `  - **Addresses**: ${formattedAddresses}`,
      `  - **Blocked by**: ${blockedBy}`,
      '  - **What it delivers**:',
      ...deliversList.map(d => `    - ${d}`),
      `  - **Verification Seam**: \`${seam}\``,
      '',
    ].join('\n');

    const nowIso = new Date().toISOString();
    const logEntry = `- **${nowIso}**: ${rationale} (Added \`${nextTaskId}\`).`;

    const amendHeaderRegex = /\n(##\s*(?:\d+\.\s*)?Amendment Log\r?\n)/i;
    const amendMatch = content.match(amendHeaderRegex);

    if (amendMatch) {
      const insertIdx = amendMatch.index;
      const beforeAmend = content.slice(0, insertIdx).trimEnd();
      const afterAmend = content.slice(insertIdx).trimEnd();
      content = `${beforeAmend}\n\n${taskBlock}\n${afterAmend}\n${logEntry}\n`;
    } else {
      content = `${content.trimEnd()}\n\n${taskBlock}\n---\n\n## 3. Amendment Log\n\n${logEntry}\n`;
    }

    fs.writeFileSync(planPath, content, 'utf8');

    // Reopen Plan, Spec, and parent Epic Brainstorm to "In Progress"
    updateFrontmatterStatus(planPath, 'In Progress');
    const planDir = path.dirname(planPath);
    const specFile = fs.readdirSync(planDir).find(f => f.startsWith('spec-') && f.endsWith('.md'));
    if (specFile) {
      updateFrontmatterStatus(path.join(planDir, specFile), 'In Progress');
    }
    if (frontmatter?.epic) {
      const epicDir = path.resolve(planDir, '../..');
      const brainPath = path.join(epicDir, `brain-${frontmatter.epic}.md`);
      updateFrontmatterStatus(brainPath, 'In Progress');
    }

    return {
      planPath,
      taskId: nextTaskId,
      status: 'In Progress',
    };
  });
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-008
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-3::REQ-012
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-012
export function computeFrontier(opts) {
  const planFiles = [];
  if (opts.plan) {
    planFiles.push(path.resolve(opts.plan));
  } else {
    const specsDir = path.resolve(opts.specsDir || process.cwd());
    const searchRoot = opts.epic ? path.join(specsDir, 'epics', String(opts.epic).replace(/^ec-/, 'ec-')) : specsDir;
    const walkPlans = dir => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkPlans(full);
        else if (entry.isFile() && entry.name.startsWith('plan-') && entry.name.endsWith('.md')) {
          planFiles.push(full);
        }
      }
    };
    walkPlans(searchRoot);
  }

  const allTasks = new Map();
  for (const pf of planFiles) {
    const content = fs.readFileSync(pf, 'utf8');
    const parsed = parsePlanTasksDetailed(content);
    for (const t of parsed) {
      allTasks.set(t.id, {
        id: t.id,
        title: t.title,
        status: t.status,
        blockers: t.blockers,
        addresses: t.addresses,
        seam: t.seam,
        planFile: pf,
      });
    }
  }

  // Validate DAG for missing blocker IDs (within single plan or full workspace) & circular dependencies
  const visiting = new Set();
  const visited = new Set();

  function dfs(taskId, chain = []) {
    if (visiting.has(taskId)) {
      throw new Error(`DAG Cycle Detected: ${[...chain, taskId].join(' -> ')}`);
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    const task = allTasks.get(taskId);
    if (task) {
      for (const blockerId of task.blockers) {
        if (!allTasks.has(blockerId) && opts.strictMissingBlockers) {
          throw new Error(`Missing Blocker Task ID: "${blockerId}" referenced by "${taskId}"`);
        }
        if (allTasks.has(blockerId)) {
          dfs(blockerId, [...chain, taskId]);
        }
      }
    }
    visiting.delete(taskId);
    visited.add(taskId);
  }

  for (const taskId of allTasks.keys()) {
    dfs(taskId);
  }

  const terminalDone = new Set(['Done', 'Skipped/Canceled', 'Rewritten']);
  const frontier = [];
  for (const task of allTasks.values()) {
    if (task.status === 'Pending' || task.status === 'Blocked') {
      const unblocked = task.blockers.every(b => {
        const bTask = allTasks.get(b);
        return bTask ? terminalDone.has(bTask.status) : true;
      });
      if (unblocked && task.status === 'Pending') {
        frontier.push(task);
      }
    }
  }

  return {
    totalTasks: allTasks.size,
    frontier,
  };
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-009
export function generateTraceTags(opts) {
  const specPath = path.resolve(opts.spec || '');
  if (!fs.existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }
  const content = fs.readFileSync(specPath, 'utf8');
  const { frontmatter } = parseFrontmatter(content);
  const specId = frontmatter?.id || path.basename(specPath, '.md');
  const taskId = opts.task || 'TASK-001';

  const reqRegex = /\*\*(REQ(?:-[A-Za-z0-9]+)?-\d{3,4})\*\*:/g;
  const reqIds = [];
  let m;
  while ((m = reqRegex.exec(content)) !== null) {
    reqIds.push(m[1]);
  }

  const lines = [];
  for (const r of reqIds) {
    lines.push(`// @verifies ${specId}::${taskId}::${r}`);
  }
  for (const r of reqIds) {
    lines.push(`// @implements ${specId}::${taskId}::${r}`);
  }
  return lines.join('\n');
}

// ============================================================================
// Dual-Axis Verification Engine (verify-artifacts parity + DAG cycle checks)
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function findFiles(dir, filterFn, ignoreDirs = new Set(['node_modules', '.git', 'target', 'dist', 'build', '.aico'])) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.scratch') continue;
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          walk(path.join(current, entry.name));
        }
      } else if (entry.isFile()) {
        const fullPath = path.join(current, entry.name);
        if (filterFn(fullPath, entry.name)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-002
// @implements spec-ft-tooling-sdd-cli::TASK-TOOL-001-4::REQ-009
export function runVerifyCli(rawArgs) {
  const isJson = rawArgs.includes('--json');
  const isVerbose = rawArgs.includes('--verbose');
  const doFix = rawArgs.includes('--fix');
  const positionalArgs = rawArgs.filter(a => !a.startsWith('--'));

  const specsDir = path.resolve(positionalArgs[0] || process.cwd());
  const codeDir = positionalArgs[1] ? path.resolve(positionalArgs[1]) : null;
  const expectedSkillsVersion = getSkillsHarnessVersion();
  const knownProjectRepos = getKnownProjectRepositories(specsDir);

  const report = {
    timestamp: new Date().toISOString(),
    specsDir,
    codeDir,
    summary: {
      totalArtifacts: 0,
      validArtifacts: 0,
      blueprintErrors: 0,
      blueprintWarnings: 0,
      totalRequirements: 0,
      implementedRequirements: 0,
      verifiedRequirements: 0,
      missingSeams: 0,
      mislocatedSeams: 0,
      validSeams: 0,
      statusMismatches: 0,
      fixedIssues: 0,
    },
    artifacts: [],
    traceability: {
      declaredRequirements: {},
      declaredTasks: {},
      implementsAnnotations: {},
      verifiesAnnotations: {},
      orphanAnnotations: [],
    },
    seams: [],
    statusContradictions: [],
  };

  function auditArtifact(filePath) {
    const relPath = path.relative(specsDir, filePath).replace(/\\/g, '/');
    const filename = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let contentModified = false;
    const lines = content.split('\n');

    const errors = [];
    const warnings = [];

    const { frontmatter, hasFrontmatterOnLine1 } = parseFrontmatter(content);
    if (!hasFrontmatterOnLine1) {
      errors.push('Missing or invalid YAML frontmatter on Line 1 (must start with "---")');
    }

    const fm = frontmatter || {};

    if (hasFrontmatterOnLine1) {
      if (!fm.id) errors.push('Missing required frontmatter field: "id"');
      if (!fm.type) errors.push('Missing required frontmatter field: "type"');
      if (!fm.title) errors.push('Missing required frontmatter field: "title"');
      if (!fm.status) errors.push('Missing required frontmatter field: "status"');

      const artifactSkillsVersion = fm.aico_skills_version || fm.aico_version;
      if (!artifactSkillsVersion) {
        if (doFix) {
          content = content.replace(/\ntype:\s*([^\n\r]+)/, `\ntype: $1\naico_skills_version: "${expectedSkillsVersion}"`);
          contentModified = true;
          report.summary.fixedIssues++;
          fm.aico_skills_version = expectedSkillsVersion;
        } else {
          errors.push(`Missing required frontmatter field: "aico_skills_version" (expected "${expectedSkillsVersion}")`);
        }
      } else if (artifactSkillsVersion !== expectedSkillsVersion) {
        if (doFix) {
          content = content.replace(
            /(?:aico_skills_version|aico_version):\s*["']?[0-9\.]+["']?/,
            `aico_skills_version: "${expectedSkillsVersion}"`
          );
          contentModified = true;
          report.summary.fixedIssues++;
          fm.aico_skills_version = expectedSkillsVersion;
        } else {
          errors.push(`Invalid skills version: expected "${expectedSkillsVersion}", found "${artifactSkillsVersion}"`);
        }
      } else if (fm.aico_version && !fm.aico_skills_version) {
        if (doFix) {
          content = content.replace(/\baico_version:/, 'aico_skills_version:');
          contentModified = true;
          report.summary.fixedIssues++;
          fm.aico_skills_version = fm.aico_version;
        }
      }

      if (fm.order === undefined && fm.type !== 'adr' && !filename.startsWith('brain-') && filename !== 'glossary.md') {
        warnings.push('Missing frontmatter field: "order" (needed for UI sequence)');
      }

      if (fm.id && fm.id !== fm.id.toLowerCase()) {
        errors.push(`Artifact ID must be strictly lowercase: "${fm.id}" -> "${fm.id.toLowerCase()}"`);
      }

      const validStatuses = new Set([
        'Draft',
        'Pending',
        'In Progress',
        'Completed',
        'Accepted',
        'Proposed',
        'Rejected',
        'Superseded',
      ]);
      if (fm.status && !validStatuses.has(fm.status)) {
        warnings.push(`Non-standard status value: "${fm.status}"`);
      }

      const fmSlice = content.slice(0, content.indexOf('\n---', 3));
      const unquotedMatch = fmSlice.match(/\nstatus:\s*([A-Za-z][A-Za-z0-9_\-\s]*)\s*(\r?\n)/);
      if (unquotedMatch && !unquotedMatch[1].startsWith('"') && !unquotedMatch[1].startsWith("'")) {
        const rawVal = unquotedMatch[1].trim();
        if (doFix) {
          content = content.replace(unquotedMatch[0], `\nstatus: "${rawVal}"${unquotedMatch[2]}`);
          contentModified = true;
          report.summary.fixedIssues++;
        } else {
          warnings.push(
            `Frontmatter field "status: ${rawVal}" is unquoted (standardize to double-quoted string: status: "${rawVal}")`
          );
        }
      }
    }

    const titleHeadingIdx = lines.findIndex(l => l.startsWith('# '));
    if (titleHeadingIdx !== -1) {
      for (let i = titleHeadingIdx + 1; i < Math.min(titleHeadingIdx + 12, lines.length); i++) {
        const line = lines[i].trim();
        if (/^\*\*(ID|Status|Type|Version|Derives From|Created)\*\*:/i.test(line)) {
          errors.push(`Duplicate metadata in markdown body: "${line}" (Rule 4: Frontmatter is single source of truth)`);
        }
      }
    }

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkTarget = match[2].trim();
      if (/^(https?:\/\/|mailto:|#)/.test(linkTarget)) continue;
      if (/^(file:\/\/\/|[A-Za-z]:[\\\/]|\/)/.test(linkTarget)) {
        errors.push(`Forbidden absolute link: "${linkTarget}" (Rule 3: Strict Relative Linking required)`);
        continue;
      }

      const cleanTarget = linkTarget.split('#')[0];
      if (cleanTarget) {
        const targetAbsPath = path.resolve(path.dirname(filePath), cleanTarget);
        if (!fs.existsSync(targetAbsPath)) {
          if (doFix && cleanTarget.includes('adr/')) {
            const adrFilename = path.basename(cleanTarget);
            const candidatePath = path.resolve(specsDir, 'adr', adrFilename);
            if (fs.existsSync(candidatePath)) {
              const correctRel = path.relative(path.dirname(filePath), candidatePath).replace(/\\/g, '/');
              content = content.replace(linkTarget, correctRel);
              contentModified = true;
              report.summary.fixedIssues++;
              continue;
            }
          }
          warnings.push(`Broken relative link to non-existent file: "${linkTarget}"`);
        }
      }
    }

    if (fm.type === 'plan' || filename.startsWith('plan-')) {
      if (
        content.includes('## 3. Active Frontier') ||
        content.includes('## Active Frontier') ||
        content.includes('## Initial Active Frontier')
      ) {
        errors.push('Contains static Active Frontier section (Rule 7: Frontier must be dynamic, remove static section)');
      }

      const amendmentHeaders = content.match(/##\s*(\d+\.)?\s*Amendment Log/gi);
      if (amendmentHeaders && amendmentHeaders.length > 1) {
        errors.push(
          `Duplicate Amendment Log headers found (${amendmentHeaders.length} occurrences). Must be single consolidated header.`
        );
      }

      if (fm.repositories === undefined) {
        warnings.push('Plan is missing required frontmatter field "repositories: [\\"...\\"]"');
      } else if (!Array.isArray(fm.repositories)) {
        errors.push(`Field "repositories" must be an array of strings (found: ${typeof fm.repositories})`);
      } else if (fm.repositories.length === 0) {
        warnings.push('Plan declares empty "repositories: []" list');
      } else if (knownProjectRepos) {
        for (const repoId of fm.repositories) {
          if (!knownProjectRepos.has(repoId)) {
            warnings.push(`Declared repository "${repoId}" is not registered in .aico-project.json`);
          }
        }
      }

      // Check for circular task dependencies inside the plan
      try {
        computeFrontier({ plan: filePath });
      } catch (cycleErr) {
        errors.push(cycleErr.message);
      }
    }

    const reqIds = [];
    if (fm.type === 'spec' || filename.startsWith('spec-')) {
      if (!content.includes('## In-Scope')) {
        warnings.push('Missing explicit "## In-Scope" boundary heading');
      }
      if (!content.includes('## Out-of-Scope')) {
        warnings.push('Missing explicit "## Out-of-Scope" boundary heading');
      }
      if (!content.includes('Designated Public Test Seams')) {
        warnings.push('Missing "## 4. Designated Public Test Seams" section');
      }

      const reqRegex = /\*\*(REQ(?:-[A-Za-z0-9]+)?-\d{3,4})\*\*:\s*([^\n]+)/g;
      let reqMatch;
      while ((reqMatch = reqRegex.exec(content)) !== null) {
        const id = reqMatch[1];
        const text = reqMatch[2];
        reqIds.push(id);
        if (!/\bshall\b/i.test(text)) {
          warnings.push(`${id}: Requirement statement missing modal verb "shall" (found: "${text.slice(0, 50)}...")`);
        }
      }

      if (fm.id) {
        report.traceability.declaredRequirements[fm.id] = reqIds;
        report.summary.totalRequirements += reqIds.length;
      }
    }

    const planTasks = [];
    if (fm.type === 'plan' || filename.startsWith('plan-')) {
      const taskRegex = /-\s+\*\*(TASK-[A-Za-z0-9\-]+)\*\*:\s*([^\n]+)/g;
      let taskMatch;
      while ((taskMatch = taskRegex.exec(content)) !== null) {
        const taskId = taskMatch[1];
        const taskTitle = taskMatch[2];
        const startIdx = taskMatch.index;

        const rest = content.slice(startIdx);
        const nextTaskIdx = rest.indexOf('\n- **TASK-');
        const nextHeaderIdx = rest.indexOf('\n## ');
        let blockEnd = rest.length;
        if (nextTaskIdx !== -1) blockEnd = Math.min(blockEnd, nextTaskIdx);
        if (nextHeaderIdx !== -1) blockEnd = Math.min(blockEnd, nextHeaderIdx);
        const block = rest.slice(0, blockEnd);

        const statusMatch = block.match(/\*\*Status\*\*:\s*([^\n\r]+)/);
        const addressesMatch = block.match(/\*\*Addresses\*\*:\s*([^\n\r]+)/);
        const blockedByMatch = block.match(/\*\*Blocked by\*\*:\s*([^\n\r]+)/);
        const seamMatch = block.match(/\*\*Verification Seam\*\*:\s*`?([^`\n\r]+)`?/);
        const deliversMatch = block.match(/\*\*What it delivers\*\*:/);

        const task = {
          id: taskId,
          title: taskTitle,
          status: statusMatch ? statusMatch[1].replace(/#.*$/, '').trim() : 'Unknown',
          addresses: addressesMatch ? addressesMatch[1].trim() : null,
          blockedBy: blockedByMatch ? blockedByMatch[1].trim() : 'None',
          seam: seamMatch ? seamMatch[1].trim() : null,
          hasDeliverables: !!deliversMatch,
        };

        planTasks.push(task);
        const addressesList = addressesMatch ? addressesMatch[1].match(/REQ-[0-9]{3,4}/g) || [] : [];
        report.traceability.declaredTasks[taskId] = {
          planFile: relPath,
          addresses: addressesList,
        };

        if (!statusMatch) warnings.push(`${taskId}: Missing explicit "**Status**:" field`);
        if (!blockedByMatch) warnings.push(`${taskId}: Missing explicit "**Blocked by**:" DAG prerequisite`);
        if (!deliversMatch) warnings.push(`${taskId}: Missing "**What it delivers**:" section`);

        if (task.seam) {
          report.seams.push({
            taskId,
            planFile: relPath,
            seamString: task.seam,
          });
        }
      }

      if (fm.status === 'Completed' && planTasks.length > 0) {
        const incompleteTasks = planTasks.filter(t => !['Done', 'Skipped/Canceled', 'Rewritten'].includes(t.status));
        if (incompleteTasks.length > 0) {
          report.statusContradictions.push({
            file: relPath,
            message: `Plan is marked status: "Completed", but has ${incompleteTasks.length} incomplete tasks (${incompleteTasks.map(t => t.id).join(', ')})`,
          });
          errors.push(`Status contradiction: Plan is "Completed" but ${incompleteTasks.length} tasks are not Done`);
        }
      }
    }

    if (contentModified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    report.artifacts.push({
      path: relPath,
      id: fm.id || filename,
      type: fm.type || 'unknown',
      status: fm.status || 'unknown',
      errors,
      warnings,
      requirementsCount: reqIds.length,
      tasksCount: planTasks.length,
    });
    report.summary.totalArtifacts++;
    if (errors.length === 0) report.summary.validArtifacts++;
    report.summary.blueprintErrors += errors.length;
    report.summary.blueprintWarnings += warnings.length;
  }

  function auditCodebase(codeRoot) {
    if (!codeRoot || !fs.existsSync(codeRoot)) return;

    const allRoots = resolveAdditionalCodeRoots(codeRoot, specsDir);
    const codeFiles = allRoots.flatMap(r =>
      findFiles(r, (f, name) => {
        return /\.(rs|ts|tsx|js|jsx|mjs|py|sh)$/.test(name) && !name.endsWith('.d.ts');
      })
    );

    const fileIndex = new Map();
    for (const f of codeFiles) {
      const rel = path.relative(codeRoot, f).replace(/\\/g, '/');
      const base = path.basename(f);
      if (!fileIndex.has(base)) fileIndex.set(base, []);
      fileIndex.get(base).push(rel);

      const stripped = base.replace(/^(security_|project_|mcp_|host_|storage_)/, '');
      if (stripped !== base) {
        if (!fileIndex.has(stripped)) fileIndex.set(stripped, []);
        fileIndex.get(stripped).push(rel);
      }
    }

    const verifiesRegex =
      /(?:\/\/|#|\/\*|\{\/\*)\s*@verifies\s+([A-Za-z0-9\-_]+)::(TASK-[A-Za-z0-9\-_]+)::(REQ-[0-9]{3,4})/g;
    const implementsRegex =
      /(?:\/\/|#|\/\*|\{\/\*)\s*@implements\s+([A-Za-z0-9\-_]+)::(TASK-[A-Za-z0-9\-_]+)::(REQ-[0-9]{3,4})/g;

    for (const filePath of codeFiles) {
      const relCodePath = path.relative(codeRoot, filePath).replace(/\\/g, '/');
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        let vMatch;
        while ((vMatch = verifiesRegex.exec(line)) !== null) {
          const rawFeature = vMatch[1];
          const taskId = vMatch[2];
          const reqId = vMatch[3];
          const specId = rawFeature.startsWith('spec-') ? rawFeature : `spec-${rawFeature}`;
          const key = `${specId}::${reqId}`;
          if (!report.traceability.verifiesAnnotations[key]) report.traceability.verifiesAnnotations[key] = [];
          report.traceability.verifiesAnnotations[key].push({ file: relCodePath, line: lineNum, taskId, specId, reqId });
        }

        let iMatch;
        while ((iMatch = implementsRegex.exec(line)) !== null) {
          const rawFeature = iMatch[1];
          const taskId = iMatch[2];
          const reqId = iMatch[3];
          const specId = rawFeature.startsWith('spec-') ? rawFeature : `spec-${rawFeature}`;
          const key = `${specId}::${reqId}`;
          if (!report.traceability.implementsAnnotations[key]) report.traceability.implementsAnnotations[key] = [];
          report.traceability.implementsAnnotations[key].push({
            file: relCodePath,
            line: lineNum,
            taskId,
            specId,
            reqId,
          });
        }
      }
    }

    for (const [specId, reqs] of Object.entries(report.traceability.declaredRequirements)) {
      for (const reqId of reqs) {
        const key = `${specId}::${reqId}`;
        if (report.traceability.implementsAnnotations[key]?.length > 0) report.summary.implementedRequirements++;
        if (report.traceability.verifiesAnnotations[key]?.length > 0) report.summary.verifiedRequirements++;
      }
    }

    const allAnnotations = [
      ...Object.values(report.traceability.implementsAnnotations)
        .flat()
        .map(v => ({ ...v, kind: 'implements' })),
      ...Object.values(report.traceability.verifiesAnnotations)
        .flat()
        .map(v => ({ ...v, kind: 'verifies' })),
    ];

    for (const ann of allAnnotations) {
      const declaredReqs = report.traceability.declaredRequirements[ann.specId];
      if (!declaredReqs || !declaredReqs.includes(ann.reqId)) {
        report.traceability.orphanAnnotations.push({
          kind: ann.kind,
          specId: ann.specId,
          taskId: ann.taskId,
          reqId: ann.reqId,
          file: ann.file,
          line: ann.line,
        });
      }
    }

    for (const seam of report.seams) {
      const rawSeamFile = seam.seamString.split('::')[0].trim();
      const strippedSeamFile = rawSeamFile.replace(/^codebase\/[^/]+\//, '');
      let absPath = path.resolve(codeRoot, rawSeamFile);
      let exists = fs.existsSync(absPath);
      if (!exists) {
        for (const r of allRoots) {
          const cand1 = path.resolve(r, rawSeamFile);
          const cand2 = path.resolve(r, strippedSeamFile);
          if (fs.existsSync(cand1)) {
            absPath = cand1;
            exists = true;
            break;
          }
          if (fs.existsSync(cand2)) {
            absPath = cand2;
            exists = true;
            break;
          }
        }
      }
      seam.exists = exists;
      seam.resolvedPath = absPath;

      if (seam.exists) {
        report.summary.validSeams++;
      } else {
        const baseName = path.basename(rawSeamFile);
        let matches = fileIndex.get(baseName);
        if (!matches || matches.length === 0) {
          const stripped = baseName.replace(/^(security_|project_|mcp_|host_|storage_)/, '');
          matches = fileIndex.get(stripped);
        }
        if (matches && matches.length > 0) {
          seam.suggestedPath = matches[0];
          report.summary.mislocatedSeams++;
        } else {
          report.summary.missingSeams++;
        }
      }
    }
  }

  function printHumanReport() {
    const c = colors;
    console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
    console.log(`${c.bold}${c.cyan}             AICO ARTIFACT & CODEBASE VERIFICATION                ${c.reset}`);
    console.log(`${c.bold}${c.cyan}======================================================================${c.reset}`);
    console.log(`${c.dim}Specs Root   : ${specsDir}${c.reset}`);
    if (codeDir) console.log(`${c.dim}Codebase Root: ${codeDir}${c.reset}`);
    console.log(`${c.dim}Skills Version: v${expectedSkillsVersion}${c.reset}`);
    console.log(`${c.dim}Timestamp    : ${report.timestamp}${c.reset}\n`);

    console.log(`${c.bold}--- 1. Verification Overview ---${c.reset}`);
    const passArtifacts = report.summary.validArtifacts === report.summary.totalArtifacts;
    const artifactStatus = passArtifacts ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`;
    console.log(
      `  Artifacts Scanned    : ${report.summary.totalArtifacts} (Valid: ${report.summary.validArtifacts}/${report.summary.totalArtifacts}) [${artifactStatus}]`
    );
    console.log(
      `  Blueprint Errors     : ${report.summary.blueprintErrors > 0 ? `${c.red}${report.summary.blueprintErrors}${c.reset}` : `${c.green}0${c.reset}`}`
    );
    console.log(
      `  Blueprint Warnings   : ${report.summary.blueprintWarnings > 0 ? `${c.yellow}${report.summary.blueprintWarnings}${c.reset}` : `${c.green}0${c.reset}`}`
    );
    if (doFix && report.summary.fixedIssues > 0) {
      console.log(`  Auto-Fixed Issues    : ${c.green}${report.summary.fixedIssues}${c.reset}`);
    }

    if (codeDir) {
      const implRate =
        report.summary.totalRequirements > 0
          ? Math.round((report.summary.implementedRequirements / report.summary.totalRequirements) * 100)
          : 100;
      const verRate =
        report.summary.totalRequirements > 0
          ? Math.round((report.summary.verifiedRequirements / report.summary.totalRequirements) * 100)
          : 100;

      console.log(`  EARS Requirements    : ${report.summary.totalRequirements}`);
      console.log(`  Code Implemented     : ${report.summary.implementedRequirements}/${report.summary.totalRequirements} (${implRate}%)`);
      console.log(`  Contract Verified    : ${report.summary.verifiedRequirements}/${report.summary.totalRequirements} (${verRate}%)`);
      console.log(`  Valid Seams on Disk  : ${c.green}${report.summary.validSeams}${c.reset}/${report.seams.length}`);
      console.log(
        `  Mislocated Seam Paths: ${report.summary.mislocatedSeams > 0 ? `${c.yellow}${report.summary.mislocatedSeams}${c.reset}` : `${c.green}0${c.reset}`}`
      );
      console.log(
        `  Missing Seam Files   : ${report.summary.missingSeams > 0 ? `${c.red}${report.summary.missingSeams}${c.reset}` : `${c.green}0${c.reset}`}`
      );
      console.log(
        `  Status Contradictions: ${report.statusContradictions.length > 0 ? `${c.red}${report.statusContradictions.length}${c.reset}` : `${c.green}0${c.reset}`}`
      );
      console.log(
        `  Orphan Annotations   : ${report.traceability.orphanAnnotations.length > 0 ? `${c.yellow}${report.traceability.orphanAnnotations.length}${c.reset}` : `${c.green}0${c.reset}`}`
      );
    }

    console.log(`\n${c.bold}--- 2. Blueprint Conformance Audit (Axis 1) ---${c.reset}`);
    let issueCount = 0;
    for (const art of report.artifacts) {
      if (art.errors.length > 0 || art.warnings.length > 0) {
        issueCount++;
        const tag = art.errors.length > 0 ? `${c.red}FAIL${c.reset}` : `${c.yellow}WARN${c.reset}`;
        console.log(`  [${tag}] ${c.bold}${art.path}${c.reset} (${art.id})`);
        for (const err of art.errors) console.log(`    ${c.red}✗ ERROR:${c.reset} ${err}`);
        for (const warn of art.warnings) console.log(`    ${c.yellow}⚠ WARN :${c.reset} ${warn}`);
      }
    }
    if (issueCount === 0) {
      console.log(
        `  ${c.green}✔ All ${report.summary.totalArtifacts} artifacts strictly conform to Blueprint v${expectedSkillsVersion} standards.${c.reset}`
      );
    }

    console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
    const hasErrors =
      report.summary.blueprintErrors > 0 || report.summary.missingSeams > 0 || report.statusContradictions.length > 0;
    if (!hasErrors) {
      console.log(`${c.bold}${c.green}VERDICT: PASSED (100% Structural & Ground-Truth Parity)${c.reset}`);
    } else {
      console.log(
        `${c.bold}${c.red}VERDICT: ACTION REQUIRED (${report.summary.blueprintErrors} Blueprint Errors, ${report.summary.missingSeams} Missing Seams, ${report.statusContradictions.length} Status Conflicts)${c.reset}`
      );
    }
    console.log(`${c.bold}${c.cyan}======================================================================${c.reset}\n`);
  }

  const markdownFiles = findFiles(specsDir, (f, name) => {
    const upper = name.toUpperCase();
    return name.endsWith('.md') && upper !== 'GEMINI.MD' && upper !== 'AGENTS.MD' && upper !== 'README.MD';
  });
  if (markdownFiles.length === 0) {
    console.error(`Error: No markdown files found under specs directory: ${specsDir}`);
    process.exit(1);
  }

  for (const file of markdownFiles) {
    auditArtifact(file);
  }

  if (codeDir) {
    auditCodebase(codeDir);
  }

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport();
  }

  const hasCriticalErrors =
    report.summary.blueprintErrors > 0 || report.summary.missingSeams > 0 || report.statusContradictions.length > 0;
  return hasCriticalErrors ? 1 : 0;
}

// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-1::REQ-001
// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-003
// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-006
// @implements spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-007

export function resolveCloneTargetDir({ workspaceRoot, repoId, type }) {
  if (type === 'specs') {
    return path.resolve(workspaceRoot, 'specs', repoId);
  }
  return path.resolve(workspaceRoot, 'codebase', repoId);
}

export function gitClone({ workspaceRoot, repoId, url, type = 'codebase', dryRun = false }) {
  if (!workspaceRoot) throw new Error('workspaceRoot is required for gitClone');
  if (!repoId) throw new Error('repoId is required for gitClone');
  if (!url) throw new Error('url is required for gitClone');

  const targetDir = resolveCloneTargetDir({ workspaceRoot, repoId, type });

  if (dryRun) {
    return {
      repoId,
      type,
      url,
      targetDir,
      cloned: false,
      dryRun: true,
    };
  }

  const parentDir = path.dirname(targetDir);
  fs.mkdirSync(parentDir, { recursive: true });

  try {
    const stdout = execFileSync('git', ['clone', url, targetDir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      repoId,
      type,
      url,
      targetDir,
      cloned: true,
      dryRun: false,
      output: stdout.trim(),
    };
  } catch (err) {
    const errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`Git clone failed for ${repoId}: ${errorDetails}`);
  }
}

export function resolveRepoDir({ workspaceRoot, repoId, repoDir }) {
  if (repoDir) {
    return path.resolve(repoDir);
  }
  if (!workspaceRoot || !repoId) {
    throw new Error('Either repoDir or both workspaceRoot and repoId must be provided');
  }
  const candidates = [
    path.resolve(workspaceRoot, '.aico-project.json'),
    path.resolve(workspaceRoot, 'specs', 'aico-specs', '.aico-project.json'),
    path.resolve(workspaceRoot, 'specs', repoId, '.aico-project.json'),
    path.resolve(workspaceRoot, 'aico-specs', '.aico-project.json'),
    path.resolve(workspaceRoot, `${repoId}`, '.aico-project.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(c, 'utf8'));
        const mDir = path.dirname(c);
        if (manifest.id === repoId) {
          return mDir;
        }
        if (Array.isArray(manifest.repositories)) {
          const entry = manifest.repositories.find(r => r.id === repoId);
          if (entry) {
            const relPath = entry.path || `../codebase/${entry.id}`;
            return path.resolve(mDir, relPath);
          }
        }
      } catch {}
    }
  }

  if (repoId.endsWith('-specs') || repoId === 'specs') {
    const nested = path.resolve(workspaceRoot, 'specs', repoId);
    if (fs.existsSync(nested)) return nested;
    return path.resolve(workspaceRoot, repoId);
  }
  return path.resolve(workspaceRoot, 'codebase', repoId);
}

export function gitStatus({ repoDir, workspaceRoot, repoId }) {
  const dir = resolveRepoDir({ workspaceRoot, repoId, repoDir });
  if (!fs.existsSync(dir)) {
    throw new Error(`Repository directory does not exist: ${dir}`);
  }

  try {
    const stdout = execFileSync('git', ['status', '--porcelain=v2', '--branch'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let branch = null;
    let upstream = null;
    let ahead = 0;
    let behind = 0;
    let staged = 0;
    let unstaged = 0;
    let untracked = 0;

    const lines = stdout.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('# branch.head ')) {
        branch = line.slice(14).trim();
        if (branch === '(detached)') branch = null;
      } else if (line.startsWith('# branch.upstream ')) {
        upstream = line.slice(18).trim();
      } else if (line.startsWith('# branch.ab ')) {
        const parts = line.slice(12).trim().split(/\s+/);
        ahead = parseInt(parts[0].replace('+', ''), 10) || 0;
        behind = parseInt(parts[1].replace('-', ''), 10) || 0;
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        const xy = line.slice(2, 4);
        if (xy[0] !== '.') staged++;
        if (xy[1] !== '.') unstaged++;
      } else if (line.startsWith('u ')) {
        staged++;
      } else if (line.startsWith('? ')) {
        untracked++;
      }
    }

    const isClean = staged === 0 && unstaged === 0 && untracked === 0;

    return {
      repoDir: dir,
      branch,
      upstream,
      ahead,
      behind,
      clean: isClean,
      staged,
      unstaged,
      untracked,
      output: stdout.trim(),
    };
  } catch (err) {
    const errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`Git status failed in ${dir}: ${errorDetails}`);
  }
}

export function gitCommit({ repoDir, workspaceRoot, repoId, message, all = false }) {
  if (!message || !message.trim()) {
    throw new Error('Commit message is required');
  }
  const dir = resolveRepoDir({ workspaceRoot, repoId, repoDir });
  if (!fs.existsSync(dir)) {
    throw new Error(`Repository directory does not exist: ${dir}`);
  }

  try {
    execFileSync('git', ['add', '-A'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdout = execFileSync('git', ['commit', '-m', message.trim()], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let hash = '';
    try {
      hash = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: dir,
        encoding: 'utf8',
      }).trim();
    } catch {}

    return {
      repoDir: dir,
      success: true,
      message: message.trim(),
      hash,
      output: stdout.trim(),
    };
  } catch (err) {
    const errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`Git commit failed in ${dir}: ${errorDetails}`);
  }
}

export function gitPull({ repoDir, workspaceRoot, repoId, remote = 'origin', branch }) {
  const dir = resolveRepoDir({ workspaceRoot, repoId, repoDir });
  if (!fs.existsSync(dir)) {
    throw new Error(`Repository directory does not exist: ${dir}`);
  }

  const args = ['pull'];
  if (branch) {
    args.push(remote, branch);
  }

  try {
    const stdout = execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      repoDir: dir,
      success: true,
      output: stdout.trim(),
    };
  } catch (err) {
    const errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`Git pull failed in ${dir}: ${errorDetails}`);
  }
}

export function gitPush({ repoDir, workspaceRoot, repoId, remote = 'origin', branch, setUpstream = false }) {
  const dir = resolveRepoDir({ workspaceRoot, repoId, repoDir });
  if (!fs.existsSync(dir)) {
    throw new Error(`Repository directory does not exist: ${dir}`);
  }

  const args = ['push'];
  if (setUpstream && branch) {
    args.push('-u', remote, branch);
  } else if (branch) {
    args.push(remote, branch);
  }

  try {
    const stdout = execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      repoDir: dir,
      success: true,
      output: stdout.trim(),
    };
  } catch (err) {
    const errorDetails = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`Git push failed in ${dir}: ${errorDetails}`);
  }
}

// ============================================================================
// CLI Entry Dispatcher
// ============================================================================

async function main() {
  const argv = process.argv.slice(2);
  const subcommand = argv[0];
  const restArgs = argv.slice(1);
  const flags = parseFlags(restArgs);

  try {
    switch (subcommand) {
      case 'version': {
        console.log(getSkillsHarnessVersion());
        break;
      }
      case 'scaffold-epic': {
        const res = scaffoldEpic({
          specsDir: flags['specs-dir'],
          id: flags.id,
          title: flags.title,
          status: flags.status,
          derivesFrom: flags['derives-from'],
          overwrite: Boolean(flags.overwrite),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Scaffolded epic ${res.epicId} at ${res.epicDir}`);
        break;
      }
      case 'scaffold-feature': {
        const res = scaffoldFeature({
          specsDir: flags['specs-dir'],
          epic: flags.epic,
          slug: flags.slug,
          title: flags.title,
          order: flags.order,
          repos: flags.repos,
          derivesFrom: flags['derives-from'],
          withDive: Boolean(flags['with-dive']),
          withBrain: Boolean(flags['with-brain']),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Scaffolded feature ${res.featureSlug} (order: ${res.order}) at ${res.featureDir}`);
        break;
      }
      case 'scaffold-adr': {
        const res = scaffoldAdr({
          specsDir: flags['specs-dir'],
          slug: flags.slug,
          title: flags.title,
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Scaffolded ${res.adrId} at ${res.path}`);
        break;
      }
      case 'upsert-glossary': {
        const res = upsertGlossary({
          specsDir: flags['specs-dir'],
          term: flags.term,
          definition: flags.definition,
          synonyms: flags.synonyms,
          example: flags.example,
          related: flags.related,
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Upserted glossary term "${res.term}" in ${res.glossaryPath}`);
        break;
      }
      case 'task-status': {
        const res = setTaskStatus({
          plan: flags.plan || flags._[0],
          task: flags.task || flags._[1],
          status: flags.status || flags._[2],
          reason: flags.reason || flags._[3],
          rewriteTarget: flags['rewrite-target'],
          codeDir: flags['code-dir'],
          skipGate: Boolean(flags['skip-gate']),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Updated ${res.taskId} -> ${res.status} (Plan status: ${res.planStatus})`);
        break;
      }
      case 'plan-amend': {
        const res = amendPlan({
          plan: flags.plan,
          taskId: flags['task-id'],
          title: flags.title,
          addresses: flags.addresses,
          seam: flags.seam,
          delivers: flags.delivers,
          blockedBy: flags['blocked-by'],
          rationale: flags.rationale,
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Amended plan ${res.planPath} with ${res.taskId}`);
        break;
      }
      case 'frontier': {
        const res = computeFrontier({
          specsDir: flags['specs-dir'],
          epic: flags.epic,
          plan: flags.plan,
          strictMissingBlockers: Boolean(flags.strict),
        });
        if (flags.json) {
          console.log(JSON.stringify(res, null, 2));
        } else {
          console.log(`Active Frontier (${res.frontier.length}/${res.totalTasks} tasks unblocked):`);
          for (const t of res.frontier) {
            console.log(`  - ${t.id}: ${t.title} [${t.addresses.join(', ')}]`);
          }
        }
        break;
      }
      case 'trace-tags': {
        console.log(
          generateTraceTags({
            spec: flags.spec,
            task: flags.task,
          })
        );
        break;
      }
      case 'verify': {
        const exitCode = runVerifyCli(restArgs);
        process.exit(exitCode);
        break;
      }
      case 'git-status': {
        const res = gitStatus({
          repoDir: flags['repo-dir'] || flags.dir,
          workspaceRoot: flags.workspace || flags['workspace-root'],
          repoId: flags.repo || flags['repo-id'],
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else {
          console.log(`Repository: ${res.repoDir}`);
          console.log(`Branch: ${res.branch || 'detached'}`);
          console.log(`Clean: ${res.clean ? 'Yes' : 'No'} (staged: ${res.staged}, unstaged: ${res.unstaged}, untracked: ${res.untracked})`);
          if (res.upstream) console.log(`Upstream: ${res.upstream} (ahead: ${res.ahead}, behind: ${res.behind})`);
        }
        break;
      }
      case 'git-pull': {
        const res = gitPull({
          repoDir: flags['repo-dir'] || flags.dir,
          workspaceRoot: flags.workspace || flags['workspace-root'],
          repoId: flags.repo || flags['repo-id'],
          remote: flags.remote || 'origin',
          branch: flags.branch,
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Pulled successfully in ${res.repoDir}:\n${res.output}`);
        break;
      }
      case 'git-push': {
        const res = gitPush({
          repoDir: flags['repo-dir'] || flags.dir,
          workspaceRoot: flags.workspace || flags['workspace-root'],
          repoId: flags.repo || flags['repo-id'],
          remote: flags.remote || 'origin',
          branch: flags.branch,
          setUpstream: Boolean(flags['set-upstream'] || flags.u),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Pushed successfully from ${res.repoDir}:\n${res.output}`);
        break;
      }
      case 'git-commit': {
        const res = gitCommit({
          repoDir: flags['repo-dir'] || flags.dir,
          workspaceRoot: flags.workspace || flags['workspace-root'],
          repoId: flags.repo || flags['repo-id'],
          message: flags.message || flags.m,
          all: Boolean(flags.all || flags.a),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`Committed [${res.hash?.slice(0, 7) || 'HEAD'}]: ${res.message}`);
        break;
      }
      case 'git-clone': {
        const res = gitClone({
          workspaceRoot: flags.workspace || flags['workspace-root'] || process.cwd(),
          repoId: flags.repo || flags['repo-id'],
          url: flags.url,
          type: flags.type || 'codebase',
          dryRun: Boolean(flags['dry-run']),
        });
        if (flags.json) console.log(JSON.stringify(res, null, 2));
        else {
          if (res.dryRun) {
            console.log(`[DRY RUN] Would clone ${res.repoId} (${res.type}) from ${res.url} into ${res.targetDir}`);
          } else {
            console.log(`Cloned ${res.repoId} into ${res.targetDir}`);
          }
        }
        break;
      }
      default: {
        console.error(
          `Unknown subcommand "${subcommand}". Available subcommands: version, scaffold-epic, scaffold-feature, scaffold-adr, upsert-glossary, task-status, plan-amend, frontier, trace-tags, verify, git-status, git-pull, git-push, git-commit, git-clone`
        );
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
