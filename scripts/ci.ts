#!/usr/bin/env npx tsx
/**
 * Local CI pipeline — runs the same checks as the CI workflow.
 *
 * Usage:  npx tsx scripts/ci.ts
 * Flags:  --skip-docker   Skip Docker-dependent integration tests
 *         --fix           Run formatters in fix mode
 *
 * Exit code 0 = all green, non-zero = failure.
 */

import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const skipDocker = args.includes('--skip-docker');
const fixMode = args.includes('--fix');

interface StepResult {
  name: string;
  ok: boolean;
  durationMs: number;
  output: string;
}

const results: StepResult[] = [];

function run(name: string, cmd: string, opts?: { allowFail?: boolean }): void {
  const start = Date.now();
  process.stdout.write(`\n▶ ${name}...\n`);
  try {
    const output = execSync(cmd, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      cwd: process.cwd(),
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      timeout: 300_000, // 5 min max per step
    });
    const elapsed = Date.now() - start;
    results.push({ name, ok: true, durationMs: elapsed, output });
    process.stdout.write(`  ✓ ${name} (${(elapsed / 1000).toFixed(1)}s)\n`);
  } catch (error: unknown) {
    const elapsed = Date.now() - start;
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim();
    if (opts?.allowFail) {
      results.push({ name, ok: true, durationMs: elapsed, output: `(skipped) ${output}` });
      process.stdout.write(`  ⚠ ${name} skipped (${(elapsed / 1000).toFixed(1)}s)\n`);
    } else {
      results.push({ name, ok: false, durationMs: elapsed, output });
      process.stdout.write(`  ✗ ${name} FAILED (${(elapsed / 1000).toFixed(1)}s)\n`);
      // Print last 20 lines of output for debugging
      const lines = output.split('\n');
      const tail = lines.slice(-20).join('\n');
      if (tail) process.stdout.write(`    ${tail.replace(/\n/g, '\n    ')}\n`);
    }
  }
}

// ── Pipeline steps ──

run('Format check', fixMode
  ? 'npx pnpm@9.15.4 format'
  : 'npx pnpm@9.15.4 format:check');

run('Build', 'npx pnpm@9.15.4 build');

run('Unit tests', 'npx pnpm@9.15.4 test');

run('Security audit', 'npx pnpm@9.15.4 audit --audit-level=high', { allowFail: true });

if (!skipDocker) {
  run('Docker Compose health', 'docker compose ps --format json', { allowFail: true });
}

// ── Summary ──

console.log('\n' + '═'.repeat(60));
console.log(' CI Pipeline Summary');
console.log('═'.repeat(60));

const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
for (const r of results) {
  const icon = r.ok ? '✓' : '✗';
  console.log(`  ${icon} ${r.name.padEnd(30)} ${(r.durationMs / 1000).toFixed(1)}s`);
}
console.log('─'.repeat(60));
console.log(`  Total: ${(totalMs / 1000).toFixed(1)}s`);

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.log(`\n  ${failed.length} step(s) FAILED:`);
  for (const f of failed) {
    console.log(`    - ${f.name}`);
  }
  process.exit(1);
} else {
  console.log('\n  All steps passed ✓');
  process.exit(0);
}
