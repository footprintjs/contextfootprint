import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--dry-run'),
  'Release accepts only --dry-run; unknown arguments are refused before publication.');
assert.equal(git('branch', '--show-current'), 'main', 'Release from reviewed main.');
assert.equal(git('status', '--porcelain'), '', 'Commit reviewed changes before release.');
// npm publish runs prepack, which rebuilds, verifies and tests a packed consumer.
// Authentication/2FA is npm-owned. Failure propagates; no tag is marked released.
execFileSync(npm, ['publish', '--access', 'public', ...args], { cwd: root, stdio: 'inherit' });
