import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'contextfootprint-package-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--offline', '--json', '--cache', join(temporary, 'npm-cache'), '--pack-destination', temporary], { cwd: root, encoding: 'utf8' }));
  const destination = join(temporary, 'node_modules/contextfootprint');
  await mkdir(destination, { recursive: true });
  execFileSync('tar', ['-xzf', join(temporary, packed[0].filename), '-C', destination, '--strip-components=1']);
  const manifest = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'));
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.publishConfig?.access, 'public');
  assert.equal(manifest.license, 'MIT');
  assert.deepEqual(manifest.dependencies ?? {}, {});
  assert.deepEqual(manifest.peerDependencies ?? {}, {});
  const operation = `const current={subject:{kind:'node',id:'11'},predicate:'status',stratum:'asserted',provenance:'packed'};if(conflictsOf([{...current,value:'up'},{...current,value:'down'}]).length!==1)throw Error('comparison failed');`;
  await writeFile(join(temporary, 'consumer.mjs'), `import {conflictsOf} from 'contextfootprint';\n${operation}\n`);
  await writeFile(join(temporary, 'consumer.cjs'), `const {conflictsOf}=require('contextfootprint');\n${operation}\n`);
  for (const extension of ['mjs', 'cjs']) execFileSync(process.execPath, [join(temporary, `consumer.${extension}`)], { cwd: temporary, stdio: 'inherit' });
  for (const example of ['compare.mjs', 'context-boundaries.mjs']) {
    execFileSync(process.execPath, [join(destination, 'examples', example)], { cwd: temporary, stdio: 'inherit' });
  }
  const types = `import { conflictsOf, type Assertion, type AssertionKeyStrategy } from 'contextfootprint';\nconst readings:readonly Assertion[]=[];\nconst key:AssertionKeyStrategy=a=>a.subject.id;\nconflictsOf(readings,new Set<string>(),key);\n`;
  await writeFile(join(temporary, 'consumer.mts'), types);
  await writeFile(join(temporary, 'consumer.cts'), types);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--lib', 'ES2022', join(temporary, 'consumer.mts'), join(temporary, 'consumer.cts')], { cwd: temporary, stdio: 'inherit' });
  execFileSync(process.execPath, ['--experimental-vm-modules', join(root, 'scripts/browser-smoke.mjs'), join(destination, 'dist/esm')], { cwd: temporary, stdio: 'inherit' });
  console.log(`Packed Node ESM/CommonJS and TypeScript consumers passed (${packed[0].size} compressed bytes).`);
} finally { await rm(temporary, { recursive: true, force: true }); }
