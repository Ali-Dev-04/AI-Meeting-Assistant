import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

/**
 * One-command dev: builds shared-types (the API consumes its compiled dist), then
 * starts the API, web, and worker together with prefixed, colorized output.
 * Ctrl+C stops everything. Zero dependencies.
 *
 * Runs every script through `npm run` with the app's own cwd, so it works in any
 * terminal even without pnpm on PATH (dependencies themselves are installed with
 * pnpm — see README; do NOT use npm to install deps).
 */

// 1) shared-types dist must exist before the API compiles/runs.
console.log('[setup] building @ama/shared-types …');
const build = spawnSync('npm', ['run', 'build'], {
  cwd: path.join(root, 'packages', 'shared-types'),
  shell: true,
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error('[setup] shared-types build failed — aborting.');
  process.exit(build.status ?? 1);
}

// 2) Start the three dev processes (npm run <script> inside each app's folder).
const targets = [
  { name: 'api', color: CYAN, cwd: 'apps/api', script: 'dev' },
  { name: 'web', color: MAGENTA, cwd: 'apps/web', script: 'dev' },
  { name: 'worker', color: YELLOW, cwd: 'apps/api', script: 'dev:worker' },
];

const children = [];

for (const { name, color, cwd, script } of targets) {
  const child = spawn('npm', ['run', script], {
    cwd: path.join(root, cwd),
    shell: true,
  });
  const prefix = `${color}[${name}]${RESET}`;
  const pipe = (stream, log) => {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.trim().length > 0) log(`${prefix} ${line}`);
      }
    });
  };
  pipe(child.stdout, console.log);
  pipe(child.stderr, console.error);
  child.on('exit', (code) => console.log(`${prefix} exited (${code})`));
  children.push(child);
}

// 3) Ctrl+C → stop the whole tree (taskkill /T on Windows kills child trees).
const shutdown = () => {
  console.log('\n[dev] shutting down…');
  for (const child of children) {
    if (child.exitCode !== null || child.killed) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(0), 1500);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[dev] api → :4000 · web → :3000 · worker consuming queue. Ctrl+C to stop.');
