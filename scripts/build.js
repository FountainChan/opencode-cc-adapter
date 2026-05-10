#!/usr/bin/env node
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: [
    '@opencode-ai/plugin',
    '@opencode-ai/sdk',
    '@modelcontextprotocol/sdk',
    'js-yaml',
    'jsonc-parser',
    'picomatch',
    'zod',
  ],
  tsconfig: 'tsconfig.json',
});

console.log('Build complete: dist/index.js');
