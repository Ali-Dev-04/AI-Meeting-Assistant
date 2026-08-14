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
 */

// 1) shared-types dist must exist before the API compiles/runs.
console.log('[setup] building @ama/shared-types …');
const build = spawnSync('pnpm', ['--filter', '@ama/shared-types', 'build'], {
  cwd: root,
  shell: true,
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error('[setup] shared-types build failed — aborting.');
  process.exit(build.status ?? 1);
}

// 2) Start the three dev processes.
const targets = [
  { name: 'api', color: CYAN, args: ['--filter', '@ama/api', 'dev'] },
  { name: 'web', color: MAGENTA, args: ['--filter', '@ama/web', 'dev'] },
  { name: 'worker', color: YELLOW, args: ['--filter', '@ama/api', 'dev:worker'] },
];

const children = [];

for (const { name, color, args } of targets) {
  const child = spawn('pnpm', args, { cwd: root, shell: true });
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
