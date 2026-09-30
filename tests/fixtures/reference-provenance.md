# Independent accounting reference

The contribution table and diagnostic totals were derived in a separate review
that read only ASSIGNMENT.md, ACCOUNTING_PRIMER.md, and ledger.json. That review
did not see production code, tests, expected fixtures, NOTES, plans, diffs, or
application answers before deriving these values. The implementation interface
was inspected only after the reference was complete.

Each entry was reviewed for its effect on the statement. Amounts are literal
signed integer cents: expense debits and revenue credits are positive; discounts
and vendor credits are negative in their respective sections. Inactive marketing
history is included. The entire rent posting belongs on January 1.

Expected eligibility, signs, amounts, and account classifications are never
inferred from the production ledger at test time. The ledger is only the input
to the calculator under test. Reference changes require review of accounting
evidence, not regeneration from application output.

The tests assume inclusive endpoints and zero-valued rows for inactive periods.
All nine accounts and seven statement totals are checked over all 6,105 valid
intervals across 110 days from 2025-12-14 through 2026-04-02. Fifteen diagnostic
cases retain independently calculated literal totals. Entry order and adjacent
period additivity are checked separately. Only monetary fields are compared, so
additive explanatory metadata does not break the accounting assertions.
