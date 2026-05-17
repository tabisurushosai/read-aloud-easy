#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const release = resolve(root, 'release');
const stage = resolve(release, 'stage');

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first');
  process.exit(1);
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

cpSync(resolve(dist, 'src'), resolve(stage, 'src'), { recursive: true });
cpSync(resolve(dist, 'assets'), resolve(stage, 'assets'), { recursive: true });
cpSync(resolve(root, 'icons'), resolve(stage, 'icons'), { recursive: true });
cpSync(resolve(root, '_locales'), resolve(stage, '_locales'), { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
manifest.background.service_worker = 'assets/background.js';
manifest.content_scripts = manifest.content_scripts.map((cs) => ({
  ...cs,
  js: cs.js.map((p) => (p === 'src/content.ts' ? 'assets/content.js' : p)),
}));
writeFileSync(resolve(stage, 'manifest.json'), JSON.stringify(manifest, null, 2));

const zipPath = resolve(release, 'read-aloud-easy.zip');
rmSync(zipPath, { force: true });
execSync(`cd "${stage}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
rmSync(stage, { recursive: true, force: true });

console.log(`\nPackaged: ${zipPath}`);
