import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const entryFile = path.join(
  rootDir,
  'components/learning/learning-pdf-reader-runtime-entry.tsx'
);
const outputFile = path.join(
  rootDir,
  'components/learning/learning-pdf-reader-runtime.generated.ts'
);

const result = await build({
  bundle: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  entryPoints: [entryFile],
  format: 'iife',
  jsx: 'automatic',
  legalComments: 'none',
  minify: true,
  platform: 'browser',
  target: ['es2020'],
  write: false,
});

const bundledSource = result.outputFiles[0]?.text ?? '';
const moduleSource = `/* eslint-disable */\nexport const learningPdfReaderRuntimeBundle = ${JSON.stringify(
  bundledSource
)};\n`;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, moduleSource, 'utf8');

console.log(`Wrote ${path.relative(rootDir, outputFile)}`);
