import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/select-ci-runtime.sh', import.meta.url));

const windowsBashExecutable = process.platform === 'win32'
  ? spawnSync('where.exe', ['bash'], { encoding: 'utf8' }).stdout.split(/\r?\n/u)[0]?.toLowerCase() ?? ''
  : '';
const windowsBashUsesWsl = windowsBashExecutable.endsWith('\\windows\\system32\\bash.exe');

function toBashPath(value) {
  if (process.platform !== 'win32') return value;
  const match = /^([a-z]):[\\/](.*)$/iu.exec(value);
  assert.ok(match, `Expected an absolute Windows path: ${value}`);
  const drive = match[1].toLowerCase();
  const relative = match[2].replaceAll('\\', '/');
  return windowsBashUsesWsl ? `/mnt/${drive}/${relative}` : `/${drive}/${relative}`;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function run(npmVersion) {
  const directory = mkdtempSync(join(tmpdir(), 'konitif-cached-runtime-'));
  const bin = join(directory, 'node', process.versions.node, 'x64', 'bin');
  mkdirSync(bin, { recursive: true });
  if (process.platform === 'win32') {
    writeFileSync(
      join(bin, 'node'),
      `#!/bin/sh\nexec ${shellQuote(toBashPath(process.execPath))} "$@"\n`,
      { mode: 0o755 }
    );
  } else {
    symlinkSync(process.execPath, join(bin, 'node'));
  }
  if (npmVersion) writeFileSync(join(bin, 'npm'), `#!/bin/sh\nprintf '%s\\n' '${npmVersion}'\n`, { mode: 0o755 });
  const bashScript = toBashPath(script);
  const bashDirectory = toBashPath(directory);
  const bashGithubPath = toBashPath(join(directory, 'github-path'));
  const launcher = join(directory, 'run-ci-runtime.sh');
  writeFileSync(
    launcher,
    `#!/bin/sh\nexport RUNNER_TOOL_CACHE=${shellQuote(bashDirectory)}\nexport GITHUB_PATH=${shellQuote(bashGithubPath)}\nexec ${shellQuote(bashScript)}\n`,
    { mode: 0o755 }
  );
  return spawnSync('bash', [toBashPath(launcher)], { encoding: 'utf8' });
}
test('selects a compatible cached runtime even without the hardcoded patch release', () => {
  const result = run('11.6.0');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Using cached Node/);
});
test('fails closed for incompatible or missing cached npm without installing anything', () => {
  for (const version of ['10.9.4', '11.5.0', 'invalid', null]) {
    const result = run(version);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no installation attempted/);
  }
});
