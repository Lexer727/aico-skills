#!/usr/bin/env node

/**
 * verify-artifacts.mjs
 * 
 * Comprehensive automated verification engine for AICO Spec-Driven Development (SDD).
 * Evaluates two distinct axes:
 *   Axis 1: Artifact Blueprint & Template Conformance (v0.1.2)
 *   Axis 2: Codebase Ground-Truth Coverage, Seam Existence & Traceability
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse command line arguments
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isVerbose = args.includes('--verbose');
const doFix = args.includes('--fix');
const positionalArgs = args.filter(a => !a.startsWith('--'));

let specsDir = positionalArgs[0] || process.cwd();
let codeDir = positionalArgs[1] || null;

// Resolve absolute paths
specsDir = path.resolve(specsDir);
if (codeDir) {
  codeDir = path.resolve(codeDir);
}

// Data structures for verification report
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
  artifacts: [], // { path, id, type, status, errors: [], warnings: [] }
  traceability: {
    declaredRequirements: {}, // specId -> [reqId]
    implementsAnnotations: {}, // specId::reqId -> [ { file, line } ]
    verifiesAnnotations: {},   // specId::reqId -> [ { file, line } ]
    orphanAnnotations: [],     // [ { file, line, kind, specId, reqId } ]
  },
  seams: [], // { task, seamPath, exists, resolvedPath, suggestedPath }
  statusContradictions: [], // { file, message }
};

// ANSI colors for CLI output
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

// Helper: recursively find files matching an extension or predicate
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

// Parse YAML frontmatter simply and robustly
function parseFrontmatter(content) {
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
        val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
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

// AXIS 1: Validate single markdown artifact
function auditArtifact(filePath) {
  const relPath = path.relative(specsDir, filePath).replace(/\\/g, '/');
  const filename = path.basename(filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let contentModified = false;
  const lines = content.split('\n');

  const errors = [];
  const warnings = [];

  // Rule 1: Line-1 YAML Frontmatter
  const { frontmatter, hasFrontmatterOnLine1 } = parseFrontmatter(content);
  if (!hasFrontmatterOnLine1) {
    errors.push('Missing or invalid YAML frontmatter on Line 1 (must start with "---")');
  }

  const fm = frontmatter || {};

  // Rule 2: Mandated Frontmatter Fields (v0.1.2)
  if (hasFrontmatterOnLine1) {
    if (!fm.id) errors.push('Missing required frontmatter field: "id"');
    if (!fm.type) errors.push('Missing required frontmatter field: "type"');
    if (!fm.title) errors.push('Missing required frontmatter field: "title"');
    if (!fm.status) errors.push('Missing required frontmatter field: "status"');

    if (fm.aico_version !== '0.1.2') {
      if (doFix && (fm.aico_version === '0.1.1' || fm.aico_version === '0.1.0')) {
        content = content.replace(/aico_version:\s*["']?[0-9\.]+["']?/, 'aico_version: "0.1.2"');
        contentModified = true;
        report.summary.fixedIssues++;
        fm.aico_version = '0.1.2';
      } else {
        errors.push(`Invalid "aico_version": expected "0.1.2", found "${fm.aico_version || 'undefined'}"`);
      }
    }

    if (fm.order === undefined && fm.type !== 'adr' && !filename.startsWith('brain-') && filename !== 'glossary.md') {
      warnings.push('Missing frontmatter field: "order" (needed for UI sequence)');
    }

    // Verify lowercase ID convention
    if (fm.id && fm.id !== fm.id.toLowerCase()) {
      errors.push(`Artifact ID must be strictly lowercase: "${fm.id}" -> "${fm.id.toLowerCase()}"`);
    }

    // Check allowed status values
    const validStatuses = new Set([
      'Draft', 'Pending', 'In Progress', 'Completed', // general
      'Accepted', 'Proposed', 'Rejected', 'Superseded' // ADR
    ]);
    if (fm.status && !validStatuses.has(fm.status)) {
      warnings.push(`Non-standard status value: "${fm.status}"`);
    }
  }

  // Rule 3: Single Source of Truth / No Duplicate Body Metadata
  const titleHeadingIdx = lines.findIndex(l => l.startsWith('# '));
  if (titleHeadingIdx !== -1) {
    for (let i = titleHeadingIdx + 1; i < Math.min(titleHeadingIdx + 12, lines.length); i++) {
      const line = lines[i].trim();
      if (/^\*\*(ID|Status|Type|Version|Derives From|Created)\*\*:/i.test(line)) {
        errors.push(`Duplicate metadata in markdown body: "${line}" (Rule 4: Frontmatter is single source of truth)`);
      }
    }
  }

  // Rule 4: Relative Linking & Dead Link Check
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    let linkTarget = match[2].trim();

    // Skip web URLs, mailto, anchor only
    if (/^(https?:\/\/|mailto:|#)/.test(linkTarget)) continue;

    // Check for forbidden absolute paths
    if (/^(file:\/\/\/|[A-Za-z]:[\\\/]|\/)/.test(linkTarget)) {
      errors.push(`Forbidden absolute link: "${linkTarget}" (Rule 3: Strict Relative Linking required)`);
      continue;
    }

    // Strip anchor for disk existence check
    const cleanTarget = linkTarget.split('#')[0];
    if (cleanTarget) {
      const targetAbsPath = path.resolve(path.dirname(filePath), cleanTarget);
      if (!fs.existsSync(targetAbsPath)) {
        // Auto-fix relative ADR links if depth was off
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

  // Rule 5: Dynamic Frontier & Clean Amendment Log (Plans)
  if (fm.type === 'plan' || filename.startsWith('plan-')) {
    if (content.includes('## 3. Active Frontier') || content.includes('## Active Frontier') || content.includes('## Initial Active Frontier')) {
      errors.push('Contains static Active Frontier section (Rule 7: Frontier must be dynamic, remove static section)');
    }

    const amendmentHeaders = content.match(/##\s*(\d+\.)?\s*Amendment Log/gi);
    if (amendmentHeaders && amendmentHeaders.length > 1) {
      errors.push(`Duplicate Amendment Log headers found (${amendmentHeaders.length} occurrences). Must be single consolidated header.`);
    }
  }

  // Rule 6: Spec Structural Rules (EARS & Seams)
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

    // Extract REQ-###
    const reqRegex = /\*\*(REQ(?:-[A-Za-z0-9]+)?-\d{3,4})\*\*:\s*([^\n]+)/g;
    let reqMatch;
    while ((reqMatch = reqRegex.exec(content)) !== null) {
      const id = reqMatch[1];
      const text = reqMatch[2];
      reqIds.push(id);

      // Check modal "shall" in EARS syntax
      if (!/\bshall\b/i.test(text)) {
        warnings.push(`${id}: Requirement statement missing modal verb "shall" (found: "${text.slice(0, 50)}...")`);
      }
    }

    if (fm.id) {
      report.traceability.declaredRequirements[fm.id] = reqIds;
      report.summary.totalRequirements += reqIds.length;
    }
  }

  // Rule 7: Plan Task Graph (DAG) Structure
  const planTasks = [];
  if (fm.type === 'plan' || filename.startsWith('plan-')) {
    const taskRegex = /-\s+\*\*(TASK-[A-Za-z0-9\-]+)\*\*:\s*([^\n]+)/g;
    let taskMatch;
    while ((taskMatch = taskRegex.exec(content)) !== null) {
      const taskId = taskMatch[1];
      const taskTitle = taskMatch[2];
      const startIdx = taskMatch.index;

      // Slice out task block until next task or header
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
        status: statusMatch ? statusMatch[1].trim() : 'Unknown',
        addresses: addressesMatch ? addressesMatch[1].trim() : null,
        blockedBy: blockedByMatch ? blockedByMatch[1].trim() : 'None',
        seam: seamMatch ? seamMatch[1].trim() : null,
        hasDeliverables: !!deliversMatch,
      };

      planTasks.push(task);

      if (!statusMatch) {
        warnings.push(`${taskId}: Missing explicit "**Status**:" field`);
      }
      if (!blockedByMatch) {
        warnings.push(`${taskId}: Missing explicit "**Blocked by**:" DAG prerequisite`);
      }
      if (!deliversMatch) {
        warnings.push(`${taskId}: Missing "**What it delivers**:" section`);
      }

      if (task.seam) {
        report.seams.push({
          taskId,
          planFile: relPath,
          seamString: task.seam,
        });
      }
    }

    // Check Plan Status vs Task Statuses Consistency
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

  const artifactResult = {
    path: relPath,
    id: fm.id || filename,
    type: fm.type || 'unknown',
    status: fm.status || 'unknown',
    errors,
    warnings,
    requirementsCount: reqIds.length,
    tasksCount: planTasks.length,
  };

  report.artifacts.push(artifactResult);
  report.summary.totalArtifacts++;
  if (errors.length === 0) {
    report.summary.validArtifacts++;
  }
  report.summary.blueprintErrors += errors.length;
  report.summary.blueprintWarnings += warnings.length;
}

// AXIS 2: Scan Codebase for in-band annotations & seams
function auditCodebase(codeRoot) {
  if (!codeRoot || !fs.existsSync(codeRoot)) return;

  // Build index of all code and test files in codebase
  const codeFiles = findFiles(codeRoot, (f, name) => {
    return /\.(rs|ts|tsx|js|jsx|py|sh)$/.test(name) && !name.endsWith('.d.ts');
  });

  const fileIndex = new Map(); // normalized-stem -> [relPaths]
  for (const f of codeFiles) {
    const rel = path.relative(codeRoot, f).replace(/\\/g, '/');
    const base = path.basename(f);
    if (!fileIndex.has(base)) {
      fileIndex.set(base, []);
    }
    fileIndex.get(base).push(rel);

    // Also index without common prefixes like security_, project_, mcp_, host_
    const stripped = base.replace(/^(security_|project_|mcp_|host_|storage_)/, '');
    if (stripped !== base) {
      if (!fileIndex.has(stripped)) fileIndex.set(stripped, []);
      fileIndex.get(stripped).push(rel);
    }
  }

  const verifiesRegex = /(?:\/\/|#)\s*@verifies\s+([A-Za-z0-9\-_]+)::([A-Za-z0-9\-_]+)/g;
  const implementsRegex = /(?:\/\/|#)\s*@implements\s+([A-Za-z0-9\-_]+)::([A-Za-z0-9\-_]+)/g;

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
        const specId = vMatch[1];
        const reqId = vMatch[2];
        const key = `${specId}::${reqId}`;
        if (!report.traceability.verifiesAnnotations[key]) {
          report.traceability.verifiesAnnotations[key] = [];
        }
        report.traceability.verifiesAnnotations[key].push({ file: relCodePath, line: lineNum });
      }

      let iMatch;
      while ((iMatch = implementsRegex.exec(line)) !== null) {
        const specId = iMatch[1];
        const reqId = iMatch[2];
        const key = `${specId}::${reqId}`;
        if (!report.traceability.implementsAnnotations[key]) {
          report.traceability.implementsAnnotations[key] = [];
        }
        report.traceability.implementsAnnotations[key].push({ file: relCodePath, line: lineNum });
      }
    }
  }

  // Cross-reference declared requirements with discovered annotations
  for (const [specId, reqs] of Object.entries(report.traceability.declaredRequirements)) {
    for (const reqId of reqs) {
      const key = `${specId}::${reqId}`;
      if (report.traceability.implementsAnnotations[key]?.length > 0) {
        report.summary.implementedRequirements++;
      }
      if (report.traceability.verifiesAnnotations[key]?.length > 0) {
        report.summary.verifiedRequirements++;
      }
    }
  }

  // Check for orphan annotations (annotating spec/req that does not exist)
  const allAnnotations = [
    ...Object.entries(report.traceability.implementsAnnotations).map(([k, v]) => ({ key: k, locs: v, kind: 'implements' })),
    ...Object.entries(report.traceability.verifiesAnnotations).map(([k, v]) => ({ key: k, locs: v, kind: 'verifies' })),
  ];

  for (const { key, locs, kind } of allAnnotations) {
    const [specId, reqId] = key.split('::');
    const declaredReqs = report.traceability.declaredRequirements[specId];
    if (!declaredReqs || !declaredReqs.includes(reqId)) {
      for (const loc of locs) {
        report.traceability.orphanAnnotations.push({
          kind,
          specId,
          reqId,
          file: loc.file,
          line: loc.line,
        });
      }
    }
  }

  // Validate Verification Seams existence on disk & find mislocated seams
  for (const seam of report.seams) {
    const rawSeamFile = seam.seamString.split('::')[0].trim();
    const absPath = path.resolve(codeRoot, rawSeamFile);
    seam.exists = fs.existsSync(absPath);
    seam.resolvedPath = absPath;

    if (seam.exists) {
      report.summary.validSeams++;
    } else {
      // Check if file exists under a sub-crate (e.g. tests/foo.rs -> crates/*/tests/foo.rs)
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

// Format and print terminal output
function printHumanReport() {
  const c = colors;
  console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}             AICO SDD ARTIFACT & CODEBASE VERIFICATION                ${c.reset}`);
  console.log(`${c.bold}${c.cyan}======================================================================${c.reset}`);
  console.log(`${c.dim}Specs Root   : ${specsDir}${c.reset}`);
  if (codeDir) {
    console.log(`${c.dim}Codebase Root: ${codeDir}${c.reset}`);
  }
  console.log(`${c.dim}Timestamp    : ${report.timestamp}${c.reset}\n`);

  // SECTION 1: Summary Table
  console.log(`${c.bold}--- 1. Verification Overview ---${c.reset}`);
  const passArtifacts = report.summary.validArtifacts === report.summary.totalArtifacts;
  const artifactStatus = passArtifacts ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`;
  console.log(`  Artifacts Scanned    : ${report.summary.totalArtifacts} (Valid: ${report.summary.validArtifacts}/${report.summary.totalArtifacts}) [${artifactStatus}]`);
  console.log(`  Blueprint Errors     : ${report.summary.blueprintErrors > 0 ? `${c.red}${report.summary.blueprintErrors}${c.reset}` : `${c.green}0${c.reset}`}`);
  console.log(`  Blueprint Warnings   : ${report.summary.blueprintWarnings > 0 ? `${c.yellow}${report.summary.blueprintWarnings}${c.reset}` : `${c.green}0${c.reset}`}`);
  if (doFix && report.summary.fixedIssues > 0) {
    console.log(`  Auto-Fixed Issues    : ${c.green}${report.summary.fixedIssues}${c.reset}`);
  }

  if (codeDir) {
    const implRate = report.summary.totalRequirements > 0
      ? Math.round((report.summary.implementedRequirements / report.summary.totalRequirements) * 100)
      : 100;
    const verRate = report.summary.totalRequirements > 0
      ? Math.round((report.summary.verifiedRequirements / report.summary.totalRequirements) * 100)
      : 100;

    console.log(`  EARS Requirements    : ${report.summary.totalRequirements}`);
    console.log(`  Code Implemented     : ${report.summary.implementedRequirements}/${report.summary.totalRequirements} (${implRate}%)`);
    console.log(`  Contract Verified    : ${report.summary.verifiedRequirements}/${report.summary.totalRequirements} (${verRate}%)`);
    console.log(`  Valid Seams on Disk  : ${c.green}${report.summary.validSeams}${c.reset}/${report.seams.length}`);
    console.log(`  Mislocated Seam Paths: ${report.summary.mislocatedSeams > 0 ? `${c.yellow}${report.summary.mislocatedSeams}${c.reset}` : `${c.green}0${c.reset}`}`);
    console.log(`  Missing Seam Files   : ${report.summary.missingSeams > 0 ? `${c.red}${report.summary.missingSeams}${c.reset}` : `${c.green}0${c.reset}`}`);
    console.log(`  Status Contradictions: ${report.statusContradictions.length > 0 ? `${c.red}${report.statusContradictions.length}${c.reset}` : `${c.green}0${c.reset}`}`);
    console.log(`  Orphan Annotations   : ${report.traceability.orphanAnnotations.length > 0 ? `${c.yellow}${report.traceability.orphanAnnotations.length}${c.reset}` : `${c.green}0${c.reset}`}`);
  }

  // SECTION 2: Artifact Details
  console.log(`\n${c.bold}--- 2. Blueprint Conformance Audit (Axis 1) ---${c.reset}`);
  let issueCount = 0;
  for (const art of report.artifacts) {
    if (art.errors.length > 0 || art.warnings.length > 0) {
      issueCount++;
      const tag = art.errors.length > 0 ? `${c.red}FAIL${c.reset}` : `${c.yellow}WARN${c.reset}`;
      console.log(`  [${tag}] ${c.bold}${art.path}${c.reset} (${art.id})`);
      for (const err of art.errors) {
        console.log(`    ${c.red}✗ ERROR:${c.reset} ${err}`);
      }
      for (const warn of art.warnings) {
        console.log(`    ${c.yellow}⚠ WARN :${c.reset} ${warn}`);
      }
    }
  }
  if (issueCount === 0) {
    console.log(`  ${c.green}✔ All ${report.summary.totalArtifacts} artifacts strictly conform to Blueprint v0.1.2 standards.${c.reset}`);
  }

  // SECTION 3: Ground-Truth Seams Audit
  if (codeDir) {
    console.log(`\n${c.bold}--- 3. Verification Seams Ground-Truth Audit (Axis 2) ---${c.reset}`);
    const unverifiedSeams = report.seams.filter(s => !s.exists);
    if (unverifiedSeams.length > 0) {
      console.log(`  ${c.yellow}Identified ${unverifiedSeams.length} seam paths requiring path adjustments or test scaffolding:${c.reset}`);
      for (const s of unverifiedSeams) {
        if (s.suggestedPath) {
          console.log(`    ${c.yellow}↳ [${s.taskId}] Mislocated Path:${c.reset} ${s.seamString}`);
          console.log(`       Suggested Correct Path: ${c.cyan}${s.suggestedPath}${c.reset}`);
        } else {
          console.log(`    ${c.red}✗ [${s.taskId}] Missing File:${c.reset} ${s.seamString}`);
          console.log(`       Expected at: ${c.dim}${path.relative(codeDir, s.resolvedPath)}${c.reset}`);
        }
      }
    } else {
      console.log(`  ${c.green}✔ All ${report.seams.length} declared verification seams physically exist on disk.${c.reset}`);
    }

    // SECTION 4: Status Contradictions
    if (report.statusContradictions.length > 0) {
      console.log(`\n${c.bold}--- 4. Task / Plan Status Contradictions ---${c.reset}`);
      for (const sc of report.statusContradictions) {
        console.log(`    ${c.red}✗ ${sc.file}:${c.reset} ${sc.message}`);
      }
    }

    // SECTION 5: Traceability Coverage & Orphans
    console.log(`\n${c.bold}--- 5. In-Band Contract Traceability Matrix ---${c.reset}`);
    for (const [specId, reqs] of Object.entries(report.traceability.declaredRequirements)) {
      const missingImpl = reqs.filter(r => !report.traceability.implementsAnnotations[`${specId}::${r}`]);
      const missingVer = reqs.filter(r => !report.traceability.verifiesAnnotations[`${specId}::${r}`]);

      const isClean = missingImpl.length === 0 && missingVer.length === 0;
      const statusIcon = isClean ? `${c.green}✔${c.reset}` : `${c.yellow}⚠${c.reset}`;
      console.log(`  ${statusIcon} ${c.bold}${specId}${c.reset} (${reqs.length} requirements)`);
      if (missingImpl.length > 0 && isVerbose) {
        console.log(`     ${c.dim}Unimplemented: ${missingImpl.join(', ')}${c.reset}`);
      }
      if (missingVer.length > 0 && isVerbose) {
        console.log(`     ${c.dim}Unverified   : ${missingVer.join(', ')}${c.reset}`);
      }
    }

    if (report.traceability.orphanAnnotations.length > 0) {
      console.log(`\n  ${c.yellow}⚠ Orphan Annotations (Target Requirement Not Declared):${c.reset}`);
      for (const orphan of report.traceability.orphanAnnotations.slice(0, 10)) {
        console.log(`    ${c.yellow}@${orphan.kind} ${orphan.specId}::${orphan.reqId}${c.reset} at ${orphan.file}:${orphan.line}`);
      }
      if (report.traceability.orphanAnnotations.length > 10) {
        console.log(`    ... and ${report.traceability.orphanAnnotations.length - 10} more orphan annotations`);
      }
    }
  }

  // Verdict
  console.log(`\n${c.bold}${c.cyan}======================================================================${c.reset}`);
  const hasErrors = report.summary.blueprintErrors > 0 || report.summary.missingSeams > 0 || report.statusContradictions.length > 0;
  if (!hasErrors) {
    console.log(`${c.bold}${c.green}VERDICT: PASSED (100% Structural & Ground-Truth Parity)${c.reset}`);
  } else {
    console.log(`${c.bold}${c.red}VERDICT: ACTION REQUIRED (${report.summary.blueprintErrors} Blueprint Errors, ${report.summary.missingSeams} Missing Seams, ${report.statusContradictions.length} Status Conflicts)${c.reset}`);
  }
  console.log(`${c.bold}${c.cyan}======================================================================${c.reset}\n`);
}

// Execution main
async function main() {
  const markdownFiles = findFiles(specsDir, (f, name) => name.endsWith('.md'));
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

  const hasCriticalErrors = report.summary.blueprintErrors > 0 || report.summary.missingSeams > 0 || report.statusContradictions.length > 0;
  process.exit(hasCriticalErrors ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(2);
});
