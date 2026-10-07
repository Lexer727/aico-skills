#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionPath = path.resolve(__dirname, '../VERSION');

try {
  const version = fs.readFileSync(versionPath, 'utf8').trim();
  console.log(version);
} catch (err) {
  console.error('Failed to read VERSION file:', err.message);
  process.exit(1);
}
