# Test coverage

Checked boxes mean the behavior has
an automated check; they are not a live test result or a claim that every possible
bug is covered. Several related inputs can be checked inside one named test.
The linked test files contain the exact assertions.

## Commands and counts

Run commands from the repository folder after `npm ci`.

| Command | What it does |
| --- | --- |
| `npm test` | Runs the 111 Node tests listed by group below. Includes actual HTTP requests and rendered React markup; excludes the separate browser runs. |
| `npm run test:accounting` | Runs the money, currency, statement, date-range reference, alternative-ledger, and calculation-explanation files. A subset of `npm test`. |
| `npm run test:validation` | Runs the ledger, date, and API files. A subset of `npm test`; the API file also checks valid responses. |
| `npm run test:browser -- --list` | Lists the 26 browser checks without running them. |
| `npm run test:browser` | Runs 13 scenarios in desktop and phone-sized Chromium: 26 checks. Builds the app and uses its own server on port 4178. |

Before the first browser run, use `npx playwright install chromium`. Leave port
4178 free. Phone emulation is not testing on a physical phone or in Safari.

The counts below describe the committed suite. Test names printed by the commands
are the executable inventory. One test contains all 6,105 date-range comparisons;
those comparisons are not 6,105 separately named tests.

| Node test file | Named tests | Question answered |
| --- | ---: | --- |
| [statement.test.js](tests/statement.test.js) | 17 | Do the accounting rules produce the expected statement? |
| [ranges.test.js](tests/ranges.test.js) | 18 | Does the supplied ledger reconcile over different periods? |
| [alternative-ledgers.test.js](tests/alternative-ledgers.test.js) | 4 | Does the code work beyond the supplied account chart? |
| [money.test.js](tests/money.test.js) | 6 | Is every cent preserved through parsing and formatting? |
| [currency.test.js](tests/currency.test.js) | 9 | Do the demonstration conversions round exactly and reconcile? |
| [dates.test.js](tests/dates.test.js) | 5 | Are the date inputs real, supported calendar dates? |
| [ledger.test.js](tests/ledger.test.js) | 22 | Is unsupported or inconsistent source data rejected? |
| [api.test.js](tests/api.test.js) | 18 | Does the real HTTP endpoint return correct results and errors? |
| [calculations.test.js](tests/calculations.test.js) | 6 | Can each explanation be traced to the actual source lines? |
| [statement-view.test.js](tests/statement-view.test.js) | 5 | Is the expected information present in the rendered HTML? |
| [startup.test.js](tests/startup.test.js) | 1 | Does an occupied port fail with a useful startup error? |
| **Total** | **111** | |

## Calculation correctness

Sources: [statement tests](tests/statement.test.js) and
[fixed Q1 expected statement](tests/fixtures/q1-statement.json).

- [x] A $100 sale and $40 cost produce $60 gross profit, operating income, and net income when there are no other expenses or income.
- [x] Every Q1 account, subtotal, and profit amount matches the fixed reference, including net income of **-$44,480.14**.
- [x] Monthly net income matches fixed answers: January **-$21,529.65**, February **-$13,230.25**, March **-$9,720.24** (three tests).
- [x] Both date boundaries count; immediately preceding/following transactions do not. A single-day report works.
- [x] Draft revenue and void expenses do not affect totals.
- [x] Returns reduce revenue; expense credits reduce expenses, and an account can have a negative amount. In the small fixture, $100 sales − $10 return − $40 cost − ($20 salary − $5 vendor credit) = **$35 net income**.
- [x] Reversing an ordinary sale reduces revenue; reversing a cost reduces cost of goods sold.
- [x] An inactive account's historical expense still counts.
- [x] A multi-line sale keeps both $15,000 product revenue and a $150 discount, for $14,850 net revenue.
- [x] The deferred-revenue invoice day, a cash-collection-only day, and a future empty day each produce zero income-statement activity while keeping all nine relevant accounts visible (three tests).
- [x] New accounts are taken from the chart, preserve chart order within a section, and contribute to totals without changing the input ledger.
- [x] An account remains visible when its posted transactions cancel to zero.
- [x] The calculator rejects invalid dates even when called directly, without HTTP.

## Different date ranges and the independent reference

Source: [range tests](tests/ranges.test.js). The reference is stored in
[expected-contributions.json](tests/fixtures/expected-contributions.json), with
[its derivation documented here](tests/fixtures/reference-provenance.md).

- [x] Compare all nine account balances, their section membership, and all seven totals for every inclusive range whose endpoints lie between **2025-12-14 and 2026-04-02**. There are 110 dates and `110 × 111 ÷ 2 = 6,105` ranges.
- [x] Compare 15 diagnostic periods to separately stored literal totals: full dataset; Q1; January; February; March; March 2 sale/discount/COGS; March 20 vendor credit; February 14 return; January–February boundary; February–March boundary; March–April boundary; March 10–20 software/draft/void period; year boundary; draft/void-only period; Q1 excluding the January 1 rent posting.
- [x] Reverse and interleave journal-entry order: account balances and totals remain the same for the diagnostic periods.
- [x] At all 109 daily splits, adding two adjacent, non-overlapping periods reproduces the full-period accounts and totals.

The separate AI reviewer first read the assignment, accounting primer, and raw
ledger without seeing the implementation or existing answers. It derived fixed
signed contributions per entry. At test time, the reference helper selects and
sums those saved contributions; it does not use the production calculator to
generate expected values. The 15 diagnostic periods also have literal totals.

This reduces dependence on the implementation's interpretation. The AI reference
and its helper can still contain mistakes or share an incorrect assumption.
The 6,105 comparisons concern this ledger and this date window, not every possible
ledger or date range. The adjacent-period check is a consistency check, not an
independent answer: a consistently wrong calculation can still be additive.

## Different valid ledgers

Source: [alternative-ledger tests](tests/alternative-ledgers.test.js).

- [x] A different company and chart work with all accounts inactive, unusual IDs (`__proto__`, `constructor`, `005`, `A-7`), ordinary and contra-revenue reversals, expense reversals, and negative other income.
- [x] Amounts larger than JavaScript Number can represent exactly retain every cent through the real HTTP response, JSON, and display formatter. One fixture's expected net income is **$90,071,992,547,409.84**.
- [x] A February 29–March 1 period in 2028 includes both boundaries and excludes adjacent dates, draft entries, and void entries.
- [x] A completely empty chart returns empty sections and zero totals.
- [x] A sales-only chart returns revenue while the absent expense and other-income sections remain empty.

The first two checklist items are assertions within one named test. These tests
exercise the display formatter, not a browser rendering of every alternative
ledger. They use synthetic fixtures without replacing the supplied ledger file.

## Exact money and valid dates

Source: [money tests](tests/money.test.js).

- [x] `$0.10 + $0.20` becomes exactly 30 integer cents.
- [x] Parse zero, one cent, ordinary values, leading zeros, and amounts beyond Number's exact integer range.
- [x] Reject malformed ledger amounts: unsupported precision, missing decimals, signs, exponent notation, whitespace, separators, numeric values, and other wrong types.
- [x] Convert positive, negative, zero, and huge BigInt cents to exact two-decimal strings; reject a Number passed as cents.
- [x] Display separators and negative parentheses without losing precision. Normalize negative zero and leading zeros for display.
- [x] Reject invalid display values rather than showing a misleading number.

Source: [date tests](tests/dates.test.js).

- [x] Accept supported `YYYY-MM-DD` dates, same-day periods, empty-data periods, and the year 0001–9999 limits.
- [x] Accept real leap days, including 2000's divisible-by-400 exception.
- [x] Reject impossible dates, such as February 29 in 2026 or 1900, April 31, invalid month/day values, and year zero, at either boundary.
- [x] Reject missing dates, wrong types, non-padded dates, alternative formats, timestamps, and whitespace.
- [x] Reject a start date after the end date with an actionable message.

## Invalid source data

Source: [ledger validation tests](tests/ledger.test.js).

- [x] Load the supplied JSON without altering it and accept its balanced entries (two tests).
- [x] Reject missing company, object-valued currency, missing/object-valued account name, non-boolean activity flag, missing entry ID, and object-valued memo (seven tests).
- [x] Reject unknown account references, duplicate account numbers, and unsupported account type/subtype combinations (three tests).
- [x] Reject an unbalanced entry, unsupported monetary precision, a line with both nonzero debit and credit, and an entry with fewer than two lines (four tests).
- [x] Reject an unknown status and an invalid accounting date (two tests).
- [x] Reject a malformed top-level structure, such as missing or non-array account/entry collections.
- [x] Reject malformed JSON syntax before accounting validation runs.
- [x] Reject malformed draft and void entries too, even though they are filtered out of calculations (two tests; strict ledger-validation policy).

## HTTP, startup, and explanation details

Source: [API tests](tests/api.test.js).

- [x] The real endpoint returns HTTP 200 and the complete expected Q1 financial response.
- [x] March, a future empty period, and the deferred-invoice day return the requested dates and correct results; zero reports retain nine zero-valued accounts (three tests).
- [x] HTTP 400 with a structured error is returned for no dates, missing start, missing end, an impossible date, reversed dates, repeated start, repeated end, and a duplicate date placed beyond Express's normal query-parser limit (eight tests).

Source: [startup test](tests/startup.test.js).

- [x] Launching on an occupied port exits with code 1 and an `EADDRINUSE` message, without the secondary TypeError from the original startup bug.

Source: [calculation explanation tests](tests/calculations.test.js).

- [x] Software lists both original source lines: $1,199.97 debit and a **-$100** contribution from the vendor credit, totaling **$1,099.97**.
- [x] Product revenue and discount explanations reference their own lines within the same journal entry.
- [x] Gross profit, operating income, and net income expose the correct formula operations and exact operands.
- [x] Contributions sum to every account amount; source positions point back to matching ledger lines; inactive history counts and excluded entries do not appear.
- [x] A balance-sheet-only period has zero accounts with empty source explanations.
- [x] Duplicate entry IDs remain distinguishable by source position, even when very large entries cancel to zero.

Source: [rendered React tests](tests/statement-view.test.js).

- [x] All 16 account/total buttons have names, begin collapsed, and connect to distinct detail regions.
- [x] Software details contain the expected source identities, amounts, sign rule, credit, and total.
- [x] Empty details are explicit, and a memo containing HTML/script text is escaped in rendered markup.
- [x] The net-income explanation displays negative operating income plus positive interest and the correct result.

These React checks inspect rendered HTML. Interactive behavior is checked in the
browser suite below. Explanations come from the same calculator as the amounts,
so they support traceability; matching explanations alone cannot prove the
accounting is correct.

## Browser checklist: 13 scenarios, each run twice

Source: [browser tests](tests/browser/statement.spec.js).

Each item is one scenario run in desktop and phone-sized Chromium. Successful
responses use the built React app and real Express calculator. Tests control
transport errors or response timing only where required to reproduce a failure.

1. [x] **Q1 display and expansion:** all 16 amounts match literal values; software, expense subtotal, and net-income details agree. Keyboard/tap controls, expanded state, closing details, and horizontal fit are checked.
2. [x] **March submission:** editing inputs alone sends no request or changes the displayed period. Generate sends the selected dates; March values and source details replace Q1; old expansions reset for the new period.
3. [x] **Empty same-day period:** all 16 displayed amounts are zero, with an explicit empty explanation and no error.
4. [x] **Invalid/missing dates:** no request is sent, and the previous report remains visible.
5. [x] **Network failure:** retain the previous report and expanded details, show an error, enable Generate, and retry successfully.
6. [x] **HTTP failure:** the same recovery behavior for a server error response.
7. [x] **Non-JSON HTTP 200:** show a friendly error instead of JSON parser details, retain the report, and retry successfully.
8. [x] **Non-JSON HTTP 503:** the same recovery behavior for an HTML error page.
9. [x] **Initial request timeout:** still loading at 14,999 ms; at 15,000 ms the fetch is aborted, a timeout message appears, and Generate enables a successful retry. No report is invented before one succeeds.
10. [x] **Later request timeout:** the same boundary and actual cancellation, retaining the previous report. Both timeout tests also advance time after retry to check for a false timeout from leftover timers.
11. [x] **Delayed response:** resubmission is blocked while loading. Editing draft dates during the wait cannot relabel the pending report; the returned statement keeps its submitted dates. The user can then submit the next period.
12. [x] **Currency selection:** GBP, EUR, and USD generate matching report amounts and expanded details; editing the dropdown alone retains the displayed report.
13. [x] **Currency request failure:** the old currency and report remain visible until a successful retry.

The last scenario does not exercise two simultaneous, different-period requests:
the UI prevents that interaction. Timeout tests advance a controlled browser
clock, so they need not wait 15 real seconds.

## Coverage limits

- Conversion coverage uses fixed USD-to-EUR/GBP demonstration rates and two-decimal output. There is no live exchange-rate service or general multi-currency accounting engine.
- Different-ledger fixtures broaden the examples; they cannot establish correctness for every possible JSON file.
- Browser coverage is Chromium only, with selected keyboard/accessibility assertions rather than a complete accessibility audit.
- Non-JSON response handling is tested; arbitrary, syntactically valid but wrongly shaped successful JSON responses are not fully validated by the client.
- Only committed automated tests are included in this inventory; ad hoc development checks are excluded.
- Structural validation and calculation tests cannot establish whether a recorded transaction actually occurred.
