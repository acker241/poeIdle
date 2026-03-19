// Copies data/processed/ → public/data/processed/ so Vite includes the
// pre-processed game data in the build output.  data/processed/ is committed
// to the repo whereas public/data/ is gitignored, so this step is required
// for CI / Railway builds where public/data/ doesn't already exist.

import { cpSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'data', 'processed');
const dest = join(root, 'public', 'data', 'processed');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(`Copied data/processed/ → public/data/processed/`);
