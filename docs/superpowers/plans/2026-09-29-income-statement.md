# Income Statement Implementation Plan

Historical implementation plan, retained as a record of the initial development
sequence. Checkboxes below reflect the original plan, not current completion
status. See [README.md](../../../README.md) for the delivered implementation and
[TESTING.md](../../../TESTING.md) for current test coverage.

**Goal:** Build the agreed local income-statement application in understandable,
independently verifiable increments.

**Architecture:** Load the fixed ledger once and calculate reports in a pure
JavaScript module. Express serializes exact amounts into the agreed JSON
contract. React requests and displays that report using native date inputs.

**Tech Stack:** JavaScript ES modules, Node.js, Express, React, Vite, Node's
built-in test runner, and npm. Node 26.0.0 is currently installed; document the
actual versions used and commit the dependency lockfile.

**Spec:** [Approved design](../specs/2026-09-29-income-statement-design.md).

## Global Constraints

- JavaScript throughout; no TypeScript migration or additional framework.
- Load the supplied ledger.json once at server startup and keep it in memory.
- Calculate money as integer cents using BigInt. Return decimal strings in JSON
  and preserve their precision when formatting the UI.
- Include every revenue and expense account, even if currently inactive or
  without activity in the selected period.
- No account visibility or active/inactive toggle.
- Only posted entries within start <= date <= end contribute.
- The backend owns all accounting calculations.
- Use native date inputs and a Generate statement submit button. Initial dates
  and report are Q1 2026: January 1 through March 31.
- Validate real Gregorian dates with years 0001 through 9999. No timestamps or
  time-zone conversions in accounting date handling.
- Preserve the supplied records; do not re-accrue rent or subscription billing.
- Q1 net income must be the exact string "-44480.14".
- Keep the last successful report visible on loading/error, labeled with its
  own response period. Ignore obsolete responses.

## Review Focus

1. Multi-line sale JE-016: report gross product revenue of 15000.00 and contra
   revenue of -150.00, without treating the receivable as revenue (Task 2).
2. Posted balance-sheet-only activity: return a successful all-zero statement
   with every income-statement account present (Tasks 2 and 3).
3. Repeated query parameters: reject two start or end values with HTTP 400;
   never choose an arbitrary one (Task 3).
4. Plausible-looking invalid dates: reject 2026-02-29 and accept 2028-02-29;
   include both ends of a same-day range (Tasks 1 and 2).
5. Very large negative amounts and zero: preserve every digit and cent without
   scientific notation or a displayed negative zero (Tasks 1 and 4).

## Files and responsibilities

| Files | Responsibility |
| --- | --- |
| package.json, package-lock.json, .gitignore | ES modules, scripts, locked dependencies, ignored build/install output |
| ledger.json | Unmodified supplied ledger data |
| shared/money.js | Exact cents parsing, decimal serialization, and display formatting |
| server/dates.js | Pure date/range validation and its error type |
| server/ledger.js | Load and validate the fixed ledger |
| server/statement.js | Pure account aggregation and response serialization |
| server/app.js, server/index.js | Testable Express app and server startup |
| index.html, vite.config.js, client/main.jsx | React entry and local development/build setup |
| client/App.jsx | Date form, request lifecycle, loading and error state |
| client/Statement.jsx, client/styles.css | Semantic statement table and restrained readable styling |
| tests/*.test.js, tests/fixtures/q1-statement.json | Domain/API tests and fixed expected Q1 response |
| README.md, NOTES.md | Run instructions and truthful submission notes |

## Task 1: Exact money and calendar dates

**Files:** Create package.json, .gitignore, shared/money.js, server/dates.js,
tests/money.test.js, and tests/dates.test.js.

**Interfaces:**

- parseLedgerAmount(value: string) -> bigint: accepts nonnegative strings with
  exactly two decimals; rejects other inputs.
- centsToDecimal(cents: bigint) -> string: signed, exactly two decimals.
- formatAmount(decimal: string) -> string: exact comma grouping, parentheses
  for negatives, and two decimals; canonical zero displays as 0.00.
- validateDateRange(start, end) -> { start: string, end: string }: checks scalar
  strings, exact shape, calendar validity, and inclusive ordering. Throws the
  exported InvalidDateRangeError for invalid input.

- [ ] Create the minimal ES-module package and test script
  (node --test tests/*.test.js). Ignore node_modules, dist, and local logs.
- [ ] Write tests containing these exact assertions, plus malformed input and
  reversed/missing range cases:

      assert.equal(parseLedgerAmount('0.10') + parseLedgerAmount('0.20'), 30n);
      assert.equal(parseLedgerAmount('90071992547409.93'), 9007199254740993n);
      assert.equal(centsToDecimal(-65025n), '-650.25');
      assert.equal(centsToDecimal(0n), '0.00');
      assert.equal(formatAmount('-90071992547409.93'), '(90,071,992,547,409.93)');
      assert.equal(formatAmount('0.00'), '0.00');
      assert.throws(() => parseLedgerAmount('1.005'));
      assert.throws(() => validateDateRange('2026-02-29', '2026-03-01'), InvalidDateRangeError);
      assert.deepEqual(validateDateRange('2028-02-29', '2028-02-29'), {
        start: '2028-02-29', end: '2028-02-29'
      });

- [ ] Run node --test tests/money.test.js tests/dates.test.js and confirm the
  tests fail because the required behavior is absent.
- [ ] Implement the interfaces. Split amount strings directly into BigInt
  components; use string operations for display. Validate dates using calendar
  arithmetic, including Gregorian leap-year rules, before comparing strings.
- [ ] Run the same command; require all assertions to pass.
- [ ] Commit this independently testable foundation.

## Task 2: Ledger integrity and statement calculation

**Files:** Create ledger.json, server/ledger.js, server/statement.js,
tests/ledger.test.js, tests/statement.test.js, and
tests/fixtures/q1-statement.json.

**Interfaces:**

- validateLedger(ledger) -> void: rejects malformed amounts/dates/statuses,
  duplicate account numbers, unknown account references, unsupported type/subtype
  combinations, or entries that lack two lines or do not balance. Each journal
  line has nonnegative debit/credit amounts with at least one side zero.
- loadLedger(filePath) -> validated Ledger: reads JSON once during startup;
  validation errors include enough entry/account context to diagnose the data.
- calculateIncomeStatement(ledger, { start, end }) -> CentStatement: validates
  the range; accepts a validated ledger; returns the spec's report structure
  with every monetary field represented as bigint. Does not mutate the input.
- serializeStatement(statement: CentStatement) -> ApiStatement: same structure
  with every monetary field converted using centsToDecimal.

- [ ] Copy the assignment's JSON from commit
  e2579c7065dcbeb15e43e1755ef59110f0da614b, preserving all 15 accounts and 25
  entries. Copy the design's complete Q1 response into the expected fixture;
  do not generate expected values with production code.
- [ ] Write ledger tests for balanced source data and rejection of unknown
  account references, unsupported categories, invalid amounts, and imbalance.
- [ ] Write calculation tests using small, balanced ledgers with explicitly
  written expected amounts. Cover a 100.00 sale and 40.00 COGS yielding 60.00
  net income; draft/void exclusion; refunds; expense credits; inactive accounts;
  boundaries; empty periods; and input immutability.
- [ ] Add the fixed source-ledger assertions:

      const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
      const q1 = serializeStatement(calculateIncomeStatement(ledger, {
        start: '2026-01-01', end: '2026-03-31'
      }));
      assert.deepEqual(q1, expectedQ1);
      assert.equal(q1.netIncome, '-44480.14');

  Also assert monthly net income strings -21529.65, -13230.25, and -9720.24;
  March 2 product revenue 15000.00 and contra revenue -150.00; January 10's
  balance-sheet-only activity produces all zero amounts. An empty period keeps
  all nine accounts. A fixture with a newly added relevant account must include
  that account too, proving that the nine-account count is not hardcoded.
- [ ] Run node --test tests/ledger.test.js tests/statement.test.js; confirm the
  new tests expose missing behavior.
- [ ] Implement loading/validation and a direct account-map aggregation. Keep
  type-to-sign and subtype-to-section rules explicit. Initialize every relevant
  account to zero, preserve negative contributions, and sort by account number.
- [ ] Run npm test; require every test to pass. Compare results with the
  worksheet in the design.
- [ ] Commit the supplied data and verified calculator.

## Task 3: HTTP endpoint

**Files:** Create server/app.js, server/index.js, tests/api.test.js; update
package.json and package-lock.json.

**Interfaces:**

- createApp(validatedLedger, { frontendDirectory } = {}) -> Express app: no
  listening or file loading on import; optional built-frontend serving.
- server/index.js: load the ledger relative to the source file, start on
  127.0.0.1:3000 by default, and fail startup with a clear error for bad data.
- GET /income-statement: exact success and error contracts from the design.

- [ ] Install Express and record the lockfile. Add npm start for the server
  and npm run server for its development watch mode.
- [ ] Write HTTP tests using an ephemeral localhost port, native fetch, and
  cleanup after each server. Cover the complete Q1 response, another date range,
  an empty period, and the January 10 all-zero report. Assert HTTP 200 and
  monetary strings, not numeric JSON values.
- [ ] Test missing, impossible, reversed, and repeated query values:

      // Against the ephemeral test server:
      const response = await fetch(baseUrl + '/income-statement?start=2026-01-01&start=2026-02-01&end=2026-03-31');
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'INVALID_DATE_RANGE');

- [ ] Run node --test tests/api.test.js; confirm failures demonstrate absent
  endpoint or validation behavior.
- [ ] Implement the small adapter around the calculator/serializer. Map
  InvalidDateRangeError to the agreed 400 envelope. Log unexpected failures and
  return a generic 500 error. Serve the built frontend when configured.
- [ ] Run npm test and verify a direct Q1 request against the running server.
- [ ] Commit the working API.

## Task 4: React page and complete local delivery

**Files:** Create index.html, vite.config.js, client/main.jsx, client/App.jsx,
client/Statement.jsx, client/styles.css, README.md, and NOTES.md; update
package.json and package-lock.json.

**Interfaces:**

- App owns draft input dates and fetches the relative /income-statement URL.
  It holds the last successful ApiStatement separately from the draft inputs.
- Statement({ report: ApiStatement }) renders the fixed section order and uses
  formatAmount for every monetary cell; it performs no financial arithmetic.
- Vite proxies /income-statement to the local Express server during development.
  The production build goes to dist, which the server serves locally.

- [ ] Install React, React DOM, Vite, and the React Vite plugin. Add npm run dev
  for the frontend, npm run build, and keep the two explicit development commands
  documented. After building, npm start serves both the page and API.
- [ ] Specify the browser acceptance checks before writing the UI: initial Q1
  net loss displayed as (44,480.14); editing dates alone leaves the report
  unchanged; Generate updates it; March displays (9,720.24); an empty period
  displays all nine zero rows. Validation prevents an invalid range request.
- [ ] Implement the form and request state. Fetch initial Q1 once per mounted
  lifecycle; use cleanup/cancellation and a request identity to prevent stale
  responses from replacing current results. Disable submit while loading and
  retain the correctly labeled last successful report on loading/error.
- [ ] Implement the semantic table with all nine source accounts, section
  subtotals and derived profit rows, account numbers, currency heading,
  right-aligned amounts, and negative parentheses. Use native date controls.
- [ ] Run npm test and npm run build. Open the real local app and perform the
  acceptance checks, including keyboard/date-picker entry, retained-report
  behavior on a failed request, and correct dates in the report heading.
  Inspect cancellation and test with delayed responses if a race is suspected.
- [ ] Write accurate README commands/versions and one-page NOTES covering the
  Q1 result, agreed assumptions, completed checks, actual AI assistance and a
  specifically challenged result or mistake, and reasonable next steps.
- [ ] Verify documented commands work and the built app serves both frontend
  and API. Commit the complete, verified local application and documentation.

## Handoff

Review independent-review findings, fix confirmed problems, and rerun affected
checks. Deliver the repository, run instructions, implementation notes, and the
video walkthrough required by the assignment.
