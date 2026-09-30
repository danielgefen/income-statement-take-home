import { cpSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptPath = fileURLToPath(import.meta.url);
const repository = dirname(dirname(scriptPath));

// This same dependency-free module is also a structured Node test reporter.
// Preserve error codes so syntax/import/runtime crashes never count as kills.
export default async function* mutationReporter(events) {
  for await (const event of events) {
    if (event.type === 'test:fail') {
      const errors = [];
      for (let error = event.data.details.error; error; error = error.cause) {
        errors.push({ code: error.code, failureType: error.failureType, message: error.message });
      }
      yield JSON.stringify({ type: 'failure', name: event.data.name, errors }) + '\n';
    } else if (event.type === 'test:stderr') {
      yield JSON.stringify({ type: 'stderr', message: event.data.message }) + '\n';
    }
  }
}

const mutations = [
  {
    name: 'include draft and void entries',
    from: "entry.status !== 'posted' || ",
    to: '',
  },
  {
    name: 'drop inactive historical accounts',
    from: 'const section = sectionForSubtype.get(account.subtype);',
    to: 'if (!account.is_active) continue;\n    const section = sectionForSubtype.get(account.subtype);',
  },
  {
    name: 'invert the revenue sign',
    from: "account.type === 'revenue' ? credit - debit : debit - credit",
    to: "account.type === 'revenue' ? debit - credit : debit - credit",
  },
  {
    name: 'treat expense credits as additional expense',
    from: "account.type === 'revenue' ? credit - debit : debit - credit",
    to: "account.type === 'revenue' ? credit - debit : debit + credit",
  },
  {
    name: 'exclude the end date',
    from: 'entry.date > end',
    to: 'entry.date >= end',
  },
  {
    name: 'omit other income from net income',
    from: 'report.netIncome = report.operatingIncome + report.otherIncome.total;',
    to: 'report.netIncome = report.operatingIncome;',
  },
];

function runTests(directory) {
  const tests = readdirSync(join(directory, 'tests')).filter(name => name.endsWith('.test.js')).sort();
  if (!tests.length) throw new Error('No test files found; refusing an empty baseline.');
  const result = spawnSync(process.execPath, [
    '--test', `--test-reporter=${scriptPath}`, ...tests.map(name => join('tests', name)),
  ], {
    cwd: directory,
    env: { ...process.env, INCOME_STATEMENT_MUTATION_REPORTER: '1' },
    encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.signal) throw new Error(`Test process did not complete: ${result.error?.message ?? result.signal}`);
  const events = result.stdout.split('\n').filter(Boolean).map(line => JSON.parse(line));
  const stderr = [result.stderr, ...events.filter(event => event.type === 'stderr').map(event => event.message)].filter(Boolean).join('\n');
  return { status: result.status, failures: events.filter(event => event.type === 'failure'), stderr };
}

function isAssertionFailure(failure) {
  // Node wraps an assertion in ERR_TEST_FAILURE; subtest-parent summaries may
  // contain only the wrapper. Actual leaf failures must be ERR_ASSERTION.
  const meaningful = failure.errors.filter(error => error.code !== 'ERR_TEST_FAILURE');
  if (meaningful.length) return meaningful.every(error => error.code === 'ERR_ASSERTION');
  return failure.errors.length > 0 && failure.errors.every(error => error.failureType === 'subtestsFailed');
}

function main() {
  const temporaryParent = realpathSync(tmpdir());
  const directory = mkdtempSync(join(temporaryParent, 'income-statement-mutations-'));
  try {
    for (const path of ['server', 'shared', 'client', 'tests', 'ledger.json', 'package.json']) {
      cpSync(join(repository, path), join(directory, path), { recursive: true });
    }
    symlinkSync(realpathSync(join(repository, 'node_modules')), join(directory, 'node_modules'), 'dir');
    const statementPath = join(directory, 'server', 'statement.js');
    const original = readFileSync(statementPath, 'utf8');
    const baseline = runTests(directory);
    if (baseline.status !== 0 || baseline.failures.length || baseline.stderr) {
      throw new Error(`Baseline must pass before mutation testing:\n${JSON.stringify(baseline, null, 2)}`);
    }
    console.log('Baseline: PASS');
    let killed = 0;
    for (const mutation of mutations) {
      const occurrences = original.split(mutation.from).length - 1;
      if (occurrences !== 1 || mutation.from === mutation.to) {
        throw new Error(`${mutation.name}: expected exactly one source match, found ${occurrences}. Update the mutation for the current implementation.`);
      }
      // Every mutant starts from the same pristine source, in the temporary copy.
      writeFileSync(statementPath, original.replace(mutation.from, mutation.to));
      const result = runTests(directory);
      const assertionCount = result.failures.filter(failure => failure.errors.some(error => error.code === 'ERR_ASSERTION')).length;
      if (result.status === 0) throw new Error(`SURVIVED: ${mutation.name}`);
      if (result.stderr || !assertionCount || !result.failures.every(isAssertionFailure)) {
        throw new Error(`INVALID MUTANT: ${mutation.name}; a crash or non-assertion failure is not evidence of accounting coverage.\n${JSON.stringify(result, null, 2)}`);
      }
      killed += 1;
      console.log(`CAUGHT: ${mutation.name} (${assertionCount} assertion failures; e.g. ${result.failures[0].name})`);
    }
    console.log(`${killed}/${mutations.length} accounting mutations caught by assertions. Production files were never modified.`);
  } finally {
    // Only remove this invocation's mkdtemp child, never a caller-supplied path.
    if (dirname(directory) !== temporaryParent || !basename(directory).startsWith('income-statement-mutations-')) {
      throw new Error('Refusing cleanup outside the tool-created temporary directory.');
    }
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.env.INCOME_STATEMENT_MUTATION_REPORTER !== '1') {
  try { main(); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
