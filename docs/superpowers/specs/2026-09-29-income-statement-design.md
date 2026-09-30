# Income statement design

Date: 2026-09-29

Initial design record. Later implementation changes are documented in
[README.md](../../../README.md), with current coverage in
[TESTING.md](../../../TESTING.md).

## Purpose and scope

Build a local income-statement application with exact monetary calculations,
explicit accounting rules, and independently testable business logic.

The app reports Northwind Coffee Roasters' recorded activity for an arbitrary
inclusive date range. It includes the required JSON endpoint, a readable React
page, meaningful tests, run instructions, and a one-page submission notes file.
The video walkthrough is a separate submission deliverable.

Source: [assignment and ledger](https://github.com/Campfire-eng/income-statement-take-home/blob/e2579c7065dcbeb15e43e1755ef59110f0da614b/README.md),
commit `e2579c7065dcbeb15e43e1755ef59110f0da614b`.

## Agreed decisions

- JavaScript throughout: Node.js and Express on the backend, React and Vite on
  the frontend. Use Node's built-in test runner for ordinary JavaScript tests.
- Load the supplied `ledger.json` once at server startup and keep it in memory.
- Calculate money as integer cents using `BigInt`. Return decimal strings in
  JSON and preserve their precision when formatting the UI.
- Include every revenue and expense account, even if currently inactive or
  without activity in the selected period. The supplied chart has nine such
  accounts. Their count and account numbers are derived from the chart, not
  hardcoded into the calculation.
- No account visibility or active/inactive toggle. Record the all-accounts
  assumption in `NOTES.md`.
- The backend owns all accounting calculations. React receives account amounts,
  subtotals, and profit totals in explicit named groups.
- Use native date inputs and a **Generate statement** submit button. Initial
  dates and report are Q1 2026: January 1 through March 31.
- Verify the calculation independently of HTTP and React, then verify the API
  contract and the visible user flow.

## Accounting rules

Only `posted` entries within `start <= date <= end` contribute. Draft and void
entries do not. Each journal line is matched to its account number.

| Account subtype | Report group | Amount |
| --- | --- | --- |
| `operating_revenue` | Revenue | Credits minus debits |
| `contra_revenue` | Revenue | Credits minus debits |
| `cogs` | Cost of goods sold | Debits minus credits |
| `operating_expense` | Operating expenses | Debits minus credits |
| `other_income` | Other income | Credits minus debits |
| `balance_sheet` | Excluded | No income-statement contribution |

Use the account's type to determine the sign and its subtype to select the
section. Preserve negative values: returns reduce revenue and credits to an
expense account reduce that expense. Do not take absolute values in calculations.

Gross profit = revenue subtotal minus COGS subtotal. Operating income = gross
profit minus operating expenses subtotal. Net income = operating income plus
other income subtotal.

Use transactions exactly as recorded. The $12,000 subscription billing entry
is not revenue; the three separate $1,000 recognition entries are. The $9,000
rent expense belongs entirely to January. Cash collection does not recognize
the original sale again. Account `6300` remains included despite `is_active: false`.

## Money and dates

Parse the original nonnegative, two-decimal journal amount strings directly into
cents: `"12450.75"` becomes `1245075n`. Reject malformed values or additional
decimal places. All sums and differences remain `BigInt`. Serialize calculated
amounts as signed strings with exactly two decimals and normalize zero to
`"0.00"`.

The UI formats these strings without converting them to JavaScript `Number`.
Show thousands separators, two decimal places, and parentheses for negative
amounts. Show `USD` in the report heading so the currency is explicit.

Dates are calendar dates, not instants. Validate the exact `YYYY-MM-DD` shape,
a real Gregorian date with a year from 0001 through 9999, and `start <= end`.
After validation, canonical strings can be compared directly. Do not introduce
timestamps or time-zone conversions. A same-day range is valid. Do not limit
requests to dates represented in the supplied data.

## Responsibilities

| Component | Responsibility |
| --- | --- |
| Ledger loading | Read the supplied JSON once; retain the original source data. |
| Money helpers | Parse cents and serialize exact decimal strings. |
| Date validation | Check real dates and inclusive range validity. |
| Statement calculation | Pure function of ledger and range; aggregate account and section amounts in cents. No filesystem, HTTP, or React dependencies. |
| Response serialization | Convert the calculated money fields into the decimal-string JSON contract. |
| Express endpoint | Accept the query, invoke validation and calculation, and return JSON or an error. |
| React page | Manage date inputs and requests; render the returned statement. |
| Display formatter | Format monetary strings exactly; directly testable without a browser. |

The calculator does not mutate the ledger. Build the relevant account list from
the chart, initialize balances to zero, aggregate qualifying lines, and calculate
the subtotals and results. Order accounts by account number within each group.

## API contract

`GET /income-statement?start=2026-01-01&end=2026-03-31`

Successful responses use HTTP 200. The complete proposed response for Q1 is:

```json
{
  "company": "Northwind Coffee Roasters",
  "currency": "USD",
  "period": { "start": "2026-01-01", "end": "2026-03-31" },
  "revenue": {
    "accounts": [
      { "number": "4000", "name": "Product Revenue", "amount": "35650.75" },
      { "number": "4100", "name": "Subscription Revenue", "amount": "3000.00" },
      { "number": "4900", "name": "Sales Returns & Discounts", "amount": "-800.25" }
    ],
    "total": "37850.50"
  },
  "costOfGoodsSold": {
    "accounts": [
      { "number": "5000", "name": "Cost of Goods Sold", "amount": "14272.75" }
    ],
    "total": "14272.75"
  },
  "grossProfit": "23577.75",
  "operatingExpenses": {
    "accounts": [
      { "number": "6000", "name": "Salaries", "amount": "55500.00" },
      { "number": "6100", "name": "Rent", "amount": "9000.00" },
      { "number": "6200", "name": "Software", "amount": "1099.97" },
      { "number": "6300", "name": "Marketing (legacy)", "amount": "2500.10" }
    ],
    "total": "68100.07"
  },
  "operatingIncome": "-44522.32",
  "otherIncome": {
    "accounts": [
      { "number": "7000", "name": "Interest Income", "amount": "42.18" }
    ],
    "total": "42.18"
  },
  "netIncome": "-44480.14"
}
```

An empty period returns the same shape and all relevant accounts with `"0.00"`
amounts and totals. It is not an HTTP error. Negative totals are also normal
successful results.

Missing, repeated, malformed, impossible, or reversed date parameters produce
HTTP 400 with a stable error envelope, for example:

```json
{ "error": { "code": "INVALID_DATE_RANGE", "message": "Start date must be on or before end date." } }
```

The API validates requests even if the native inputs already validated them.
Unexpected internal failures return HTTP 500 with a generic message and server
logging. Bad ledger data must fail clearly rather than silently omit financial
activity. Use small checks for account references, supported classifications,
amounts, and balanced entries; a general ingestion framework is outside scope.

## Page behavior

On initial load, request Q1. Subsequently, changing either date edits the form;
only submission requests a new report. Label both native date inputs and make
them required. Check the range before requesting and show useful validation
messages near the form.

Show loading feedback and disable submission while a request is pending. Keep
the last successful statement available during loading or an error, with its
own response period displayed. Never relabel old results using unsubmitted
input values, and ignore responses from obsolete requests.

Render a semantic table in the assignment's order: Revenue, COGS, Gross profit,
Operating expenses, Operating income, Other income, Net income. Account rows
show number, name, and a right-aligned amount. Distinguish section subtotals and
profit rows with simple typography and borders. Preserve signs, including a
net loss. There is no need for charts or a custom calendar.

## Verification and reference numbers

Before implementation, the assignment's Q1 lines were tabulated explicitly by
account and summed using exact integer arithmetic. A separate aggregation of
the source ledger matched every account. All 25 supplied journal entries
balance, and 20 posted entries fall within Q1.

This AI-assisted reference calculation supplies fixed expected values for tests;
expected values are not generated by the production calculator. Reference
provenance is documented in
[reference-provenance.md](../../../tests/fixtures/reference-provenance.md).

| Account | Q1 worksheet (USD) | Expected amount |
| --- | --- | ---: |
| Product Revenue | 12,450.75 + 8,200.00 + 15,000.00 | 35,650.75 |
| Subscription Revenue | 1,000.00 + 1,000.00 + 1,000.00 | 3,000.00 |
| Sales Returns & Discounts | -650.25 - 150.00 | -800.25 |
| Cost of Goods Sold | 4,980.30 + 3,280.00 + 6,012.45 | 14,272.75 |
| Salaries | 18,500.00 + 18,500.00 + 18,500.00 | 55,500.00 |
| Rent | 9,000.00 | 9,000.00 |
| Software | 1,199.97 - 100.00 | 1,099.97 |
| Marketing (legacy) | 2,500.10 | 2,500.10 |
| Interest Income | 42.18 | 42.18 |

The subtotals are revenue 37,850.50; COGS 14,272.75; gross profit 23,577.75;
operating expenses 68,100.07; operating income -44,522.32; other income 42.18;
and **net income -44,480.14**.

An additional check groups activity by month: January net income -21,529.65,
February -13,230.25, March -9,720.24. These sum to -44,480.14. Monthly reporting
is a verification technique, not an additional UI feature.

Planned tests and checks:

1. Money: exact parsing, sums, signed serialization, zero, large amounts beyond
   the safe `Number` integer range, and rejection of malformed precision.
2. Small synthetic ledgers: independently obvious answers; revenue and expense
   reversals, contra revenue, vendor credits, draft/void exclusions, inactive
   accounts, balance-sheet-only entries, and zero-activity accounts.
3. Dates: inclusive first/last days, same-day ranges, out-of-range entries,
   empty periods, real leap dates, invalid dates, and reversed ranges.
4. Supplied ledger: every Q1 account, subtotal, and profit result; monthly
   reference results and fixture integrity.
5. API integration: real HTTP requests to the Express app, success/error
   statuses, the response shape, and decimal-string amounts. These tests do
   not use React.
6. Formatting: negative parentheses, thousands separators, two decimal places,
   exact very large amounts, and zero; run without a browser.
7. Browser checks: initial report, keyboard/date-picker entry, Generate behavior,
   changed periods, empty results, validation, and loading/failure feedback.

## Submission and scope control

Use ordinary commits as work progresses. The final README records the actual
runtime/tool versions, setup, backend/frontend commands, and test commands.
The final one-page `NOTES.md` records Q1 net income, assumptions, completed
verification, honest AI usage and a specifically challenged result or mistake,
and reasonable next steps. Do not claim a check was performed until it was.

The app does not require a database, authentication, deployment, Docker, ledger
editing, account filters, comparisons, exports, or a generic reporting engine.
Those remain outside the agreed scope.
