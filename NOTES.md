# Implementation notes

## Q1 2026 result

January 1–March 31 net income is **-$44,480.14** (a net loss).

| Line | USD |
| --- | ---: |
| Revenue, net of returns/discounts | 37,850.50 |
| Cost of goods sold | 14,272.75 |
| Gross profit | 23,577.75 |
| Operating expenses | 68,100.07 |
| Operating income | -44,522.32 |
| Other income | 42.18 |
| Net income | -44,480.14 |

## Assumptions and decisions

Only posted entries within the inclusive date range count. Revenue uses credits minus debits; expenses use debits minus credits. Subtypes determine sections. Balance-sheet accounts never enter the statement. Inactive and zero-activity income-statement accounts stay visible; inactivity does not erase historical expenses.

The supplied journal is authoritative: the $12,000 subscription invoice is deferred revenue, with only three $1,000 recognition entries counted in Q1. Cash collection is not revenue again. All $9,000 rent stays in January as posted; this report does not introduce new accrual entries. Returns/discounts reduce revenue, and the $100 vendor credit reduces software expense. Draft bonuses and void duplicates are excluded.

Amounts use BigInt cents from parsing through calculation, and exact decimal strings across JSON and display. This fixed USD dataset accepts two-decimal nonnegative journal amounts; unsupported precision is rejected rather than rounded. Invalid ledger data fails startup instead of producing a partial report. Empty periods are successful zero reports, not errors.

## Verification and AI assistance

Codex assisted with design discussion, independent source-data tabulation, implementation, tests, and documentation. The candidate selected JavaScript/React, exact cents, account visibility, and explicit form submission before implementation. The Q1 worksheet was calculated from the supplied JSON, not supplied as an official answer; a candidate-led calculation walkthrough is still pending.

Automated tests compare all Q1 lines and totals with literal expected values, plus small balanced examples, monthly totals, date boundaries, reversals, refunds, expense credits, inactive/new accounts, empty periods, malformed data, HTTP errors, and startup behavior. Monthly net income is -$21,529.65, -$13,230.25, and -$9,720.24, summing to the Q1 loss. Browser checks exercised the built application, including a stopped-server failure that preserved the prior report.

One actual AI-generated mistake: the initial startup callback assumed Express called it only on successful listening. Express 5 also calls it on a listen error, causing a secondary null-address crash. A failing occupied-port test reproduced it; handling the explicit `listening` and `error` events fixed it. This is documented in `tests/startup.test.js`.

## With more time

Automate the browser interaction and delayed-response checks; extend metadata validation if the ledger becomes user-supplied; add more currencies only with explicit precision rules. Database storage, authentication, deployment, and editing the ledger are intentionally outside this read-only take-home.
