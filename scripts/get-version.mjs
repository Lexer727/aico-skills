#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginJsonPath = path.resolve(__dirname, '../plugin.json');
const legacyVersionPath = path.resolve(__dirname, '../VERSION');

try {
  if (fs.existsSync(pluginJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    if (pkg.version) {
      console.log(pkg.version.trim());
      process.exit(0);
    }
  }
  const version = fs.readFileSync(legacyVersionPath, 'utf8').trim();
  console.log(version);
} catch (err) {
  console.error('Failed to read version from plugin.json:', err.message);
  process.exit(1);
}
