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

Codex assisted with design, implementation, tests, and documentation. The candidate selected JavaScript/React, exact cents, account visibility, explicit submission, and expandable calculation details. The Q1 worksheet was derived from the JSON, not supplied as an official answer. Accounting examples were discussed together; independent candidate review remains important.

An independent AI reviewer tabulated every entry before seeing implementation code. Literal contributions check every account and total across 6,105 date intervals. Synthetic ledgers cover alternative charts, leap days, reversals, and huge exact amounts through HTTP/display. Separate tests reject invalid JSON, metadata, dates, references, and unbalanced entries. Six deliberate accounting mutations must fail assertions in isolated copies. Browser tests cover desktop/phone layouts, real API submissions, disclosures, errors/retries, and delayed responses. This is evidence, not proof against all bugs; expandable details aid auditing but are not independent verification. README documents commands and limitations.

One actual AI-generated mistake: the initial startup callback assumed Express called it only on successful listening. Express 5 also calls it on a listen error, causing a secondary null-address crash. A failing occupied-port test reproduced it; handling the explicit `listening` and `error` events fixed it. This is documented in `tests/startup.test.js`.

## With more time

Broaden browser coverage beyond Chromium and add currency-specific precision only with explicit rules. Duplicate entry IDs are not silently deduplicated; trace identity uses source position. Database storage, authentication, deployment, and ledger editing remain outside this read-only take-home.
