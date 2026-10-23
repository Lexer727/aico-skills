// @verifies spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-1::REQ-001
// @verifies spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-003
// @verifies spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-006
// @verifies spec-ft-git-manifest-and-workflow-skill::TASK-GIT-005-4::REQ-007

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  getKnownProjectRepositories,
  resolveAdditionalCodeRoots,
  resolveCloneTargetDir,
  gitClone,
  gitStatus,
  gitCommit,
} from '../scripts/aico-cli.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_ROOT = path.resolve(__dirname, '..');
const AGENTS_SKILLS_ROOT = path.resolve(__dirname, '../../../.agents/skills');

test('REQ-001: Top-level specs repo in .aico-project.json and default codebase paths', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aico-manifest-test-'));
  const specsDir = path.join(tmpDir, 'test-specs');
  fs.mkdirSync(specsDir, { recursive: true });

  const manifest = {
    project_name: 'test-project',
    name: 'Test Project Specs',
    id: 'test-project-specs',
    url: 'https://github.com/example/test-project-specs',
    created_at: '2026-10-05T18:45:00Z',
    repositories: [
      {
        id: 'test-engine',
        name: 'Test Engine',
        url: 'https://github.com/example/test-engine',
        type: 'codebase',
        // path omitted to test default resolution to ../codebase/test-engine
      },
      {
        id: 'test-skills',
        name: 'Test Skills',
        path: '../codebase/custom-skills-path',
        url: 'https://github.com/example/test-skills',
        type: 'skills',
      },
    ],
  };

  fs.writeFileSync(path.join(specsDir, '.aico-project.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Verify getKnownProjectRepositories includes both top-level manifest.id and repositories
  const knownRepos = getKnownProjectRepositories(specsDir);
  assert.ok(knownRepos instanceof Set, 'Should return a Set of repository IDs');
  assert.ok(knownRepos.has('test-project-specs'), 'Must include top-level manifest.id');
  assert.ok(knownRepos.has('test-engine'), 'Must include codebase repository id');
  assert.ok(knownRepos.has('test-skills'), 'Must include skills repository id');
  assert.equal(knownRepos.size, 3);

  // Create corresponding directories to test resolveAdditionalCodeRoots
  const defaultCodeDir = path.resolve(specsDir, '../codebase/test-engine');
  const customCodeDir = path.resolve(specsDir, '../codebase/custom-skills-path');
  fs.mkdirSync(defaultCodeDir, { recursive: true });
  fs.mkdirSync(customCodeDir, { recursive: true });

  const roots = resolveAdditionalCodeRoots(defaultCodeDir, specsDir);
  assert.ok(roots.includes(path.resolve(defaultCodeDir)), 'Must include base codeDir');
  assert.ok(roots.includes(path.resolve(customCodeDir)), 'Must include custom skills codeDir from manifest');
});

test('REQ-003: /aico-git skill specification and CLI integration', () => {
  const skillFile = path.resolve(SKILLS_ROOT, 'aico-git/SKILL.md');
  assert.ok(fs.existsSync(skillFile), 'codebase/aico-skills/aico-git/SKILL.md must exist');

  const content = fs.readFileSync(skillFile, 'utf8');
  assert.ok(content.includes('name: aico-git'), 'Must declare name: aico-git');
  assert.ok(content.includes('git-status'), 'Must document git-status');
  assert.ok(content.includes('git-pull'), 'Must document git-pull');
  assert.ok(content.includes('git-push'), 'Must document git-push');
  assert.ok(content.includes('git-commit'), 'Must document git-commit');
  assert.ok(content.includes('git-clone'), 'Must document git-clone');
  assert.ok(content.includes('codebase'), 'Must document codebase placement rule');

  const agentsSkillFile = path.resolve(AGENTS_SKILLS_ROOT, 'aico-git/SKILL.md');
  assert.ok(fs.existsSync(agentsSkillFile), '.agents/skills/aico-git/SKILL.md must exist');
});

test('REQ-006: Codebase and skills repositories clone into <workspace-root>/codebase/<repo-id>', () => {
  const workspaceRoot = 'd:/mock-workspace';

  const codebaseTarget = resolveCloneTargetDir({
    workspaceRoot,
    repoId: 'my-service',
    type: 'codebase',
  });
  assert.equal(codebaseTarget, path.resolve(workspaceRoot, 'codebase', 'my-service'));

  const skillsTarget = resolveCloneTargetDir({
    workspaceRoot,
    repoId: 'my-skills',
    type: 'skills',
  });
  assert.equal(skillsTarget, path.resolve(workspaceRoot, 'codebase', 'my-skills'));

  const cloneRes = gitClone({
    workspaceRoot,
    repoId: 'my-backend',
    url: 'https://github.com/example/my-backend',
    type: 'codebase',
    dryRun: true,
  });
  assert.equal(cloneRes.dryRun, true);
  assert.equal(cloneRes.cloned, false);
  assert.equal(cloneRes.targetDir, path.resolve(workspaceRoot, 'codebase', 'my-backend'));
});

test('REQ-007: Specs repositories clone into <workspace-root>/<repo-id>', () => {
  const workspaceRoot = 'd:/mock-workspace';

  const specsTarget = resolveCloneTargetDir({
    workspaceRoot,
    repoId: 'my-project-specs',
    type: 'specs',
  });
  assert.equal(specsTarget, path.resolve(workspaceRoot, 'my-project-specs'));

  const cloneRes = gitClone({
    workspaceRoot,
    repoId: 'project-specs',
    url: 'https://github.com/example/project-specs',
    type: 'specs',
    dryRun: true,
  });
  assert.equal(cloneRes.dryRun, true);
  assert.equal(cloneRes.cloned, false);
  assert.equal(cloneRes.targetDir, path.resolve(workspaceRoot, 'project-specs'));
});

test('REQ-003 & REQ-009: gitStatus and gitCommit lifecycle on git repo and error handling', () => {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'aico-git-test-repo-'));

  try {
    // Initialize a temporary git repository
    execFileSync('git', ['init'], { cwd: tmpRepo });
    execFileSync('git', ['config', 'user.name', 'AICO Test'], { cwd: tmpRepo });
    execFileSync('git', ['config', 'user.email', 'test@aico.dev'], { cwd: tmpRepo });

    // Status on newly initialized empty repo
    const status1 = gitStatus({ repoDir: tmpRepo });
    assert.equal(status1.clean, true);
    assert.equal(status1.untracked, 0);

    // Create a new file
    fs.writeFileSync(path.join(tmpRepo, 'sample.txt'), 'hello world', 'utf8');

    // Status should report untracked file
    const status2 = gitStatus({ repoDir: tmpRepo });
    assert.equal(status2.clean, false);
    assert.equal(status2.untracked, 1);

    // Error handling: committing without message must throw
    assert.throws(
      () => gitCommit({ repoDir: tmpRepo, message: '' }),
      /Commit message is required/
    );

    // Commit file
    const commitRes = gitCommit({
      repoDir: tmpRepo,
      message: 'feat: initial commit',
      all: true,
    });
    assert.equal(commitRes.success, true);
    assert.equal(commitRes.message, 'feat: initial commit');
    assert.ok(commitRes.hash && commitRes.hash.length >= 7, 'Must return commit hash');

    // After commit, status should be clean
    const status3 = gitStatus({ repoDir: tmpRepo });
    assert.equal(status3.clean, true);
    assert.equal(status3.untracked, 0);
  } finally {
    try {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    } catch {}
  }
});
