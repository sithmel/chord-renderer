#!/usr/bin/env node
//@ts-check
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');
const publicDir = resolve(root, 'public');

async function run() {
  await build({
    entryPoints: [resolve(publicDir, 'app.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2018'],
    sourcemap: true,
    outfile: resolve(publicDir, 'bundle.js'),
    logLevel: 'info',
  });
  // Simple size note
  const size = readFileSync(resolve(publicDir, 'bundle.js')).length;
  writeFileSync(resolve(publicDir, 'bundle.size.txt'), `${size} bytes`);
  console.log(`Demo bundle written: ${size} bytes`);
}

run().catch((err) => { console.error(err); process.exit(1); });
