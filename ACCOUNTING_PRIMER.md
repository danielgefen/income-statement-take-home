# Accounting primer

The core ideas of bookkeeping, one or two sentences each. You do not need all of them for
the take-home. Use this as a reference.

## The books

- **Accounting equation.** Assets = Liabilities + Equity. Every transaction keeps this true.
- **Account.** A named bucket that tracks one kind of value, such as Cash or Rent.
- **Chart of accounts.** The list of all accounts a company uses, usually numbered by type
  (1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue, 5xxx and up expenses).
- **Account type.** One of asset, liability, equity, revenue, or expense. The type decides
  the normal balance and which statement the account appears on.
- **Account subtype.** A finer grouping inside a type, such as cost of goods sold versus
  operating expense, that decides where the account goes on a statement.
- **Parent account and roll-up.** Accounts can be nested. A parent shows the sum of its
  children.
- **Inactive account.** An account closed to new postings. Its history is unchanged.
- **General ledger (GL).** The complete record of every posted line in every account. The
  financial statements are built from it.
- **Subledger.** A detailed record for one area, such as invoices or bills, that feeds
  summary totals into the general ledger.
- **Journal.** The chronological list of journal entries.

## Recording transactions

- **Journal entry.** One recorded business event, with a date, a memo, and two or more lines.
- **Journal line.** One debit or one credit to one account inside a journal entry.
- **Double entry.** Every entry touches at least two accounts, and its total debits equal
  its total credits.
- **Debit.** The left side of an entry. It increases assets and expenses and decreases
  liabilities, equity, and revenue.
- **Credit.** The right side of an entry. It increases liabilities, equity, and revenue and
  decreases assets and expenses.
- **Normal balance.** The side, debit or credit, that increases an account. Assets and
  expenses are debit-normal. Liabilities, equity, and revenue are credit-normal.
- **Balance.** Total debits minus total credits for an account, usually shown with the sign
  flipped for credit-normal accounts so that the typical balance is positive.
- **T-account.** A sketch of one account with debits on the left and credits on the right,
  used to reason about balances by hand.
- **Contra account.** An account that offsets another of the same type and carries the
  opposite normal balance, such as sales returns against revenue or accumulated
  depreciation against equipment.
- **Accounting date.** The date the event counts in the books. It can differ from the date
  the entry was typed in.
- **Memo.** Free text that explains an entry. It has no effect on the numbers.

## Entry lifecycle

- **Draft.** An entry that is saved but not yet in the books, often waiting for approval.
- **Posted.** An entry that is in the books and affects balances and statements.
- **Void.** A cancelled entry. It stays on record for the audit trail but has no effect on
  balances.
- **Reversing entry.** A new entry that mirrors an earlier one with debits and credits
  swapped, used to undo it without editing history.
- **Adjusting entry.** An entry made at period end to record accruals, deferrals,
  depreciation, or corrections.
- **Correcting entry.** An entry that fixes a mistake in an earlier posted entry.
- **Audit trail.** The ability to trace every number back to the entries and people that
  produced it. This is why posted entries are corrected, not edited or deleted.
- **Approval.** A review step that must pass before a draft can be posted.

## Timing

- **Accounting period.** The span a report covers, usually a month, quarter, or year.
- **Fiscal year.** The company's 12-month reporting year. It does not have to match the
  calendar year.
- **Accrual basis.** Revenue is recorded when it is earned and expenses when they are
  incurred, whenever the cash moves. This is the standard under GAAP.
- **Cash basis.** Revenue and expenses are recorded when cash is received or paid.
- **Revenue recognition.** The rules for when revenue counts as earned, generally when the
  goods or services are delivered.
- **Matching principle.** Expenses are recorded in the same period as the revenue they
  helped produce.
- **Accrual.** Recording revenue or expense before the cash moves, such as wages earned but
  not yet paid.
- **Deferral.** Recording cash before the revenue or expense is earned or used, then
  recognizing it over time.
- **Accounts receivable (AR).** Money customers owe the company. An asset.
- **Accounts payable (AP).** Money the company owes vendors. A liability.
- **Deferred revenue.** Cash billed or received for goods or services not yet delivered. A
  liability until it is earned.
- **Prepaid expense.** Cash paid for something not yet used, such as rent paid in advance.
  An asset until it is used up.
- **Accrued expense.** An expense incurred but not yet billed or paid. A liability.
- **Depreciation.** Spreading the cost of a physical asset over its useful life.
- **Amortization.** Spreading a cost, such as a prepaid or an intangible asset, over time.
- **Period close.** The month-end or year-end process of finishing entries, reconciling
  accounts, and locking the period.
- **Locked period.** A closed period that no longer accepts new or changed entries.
- **Closing entries.** Year-end entries that move revenue and expense balances into
  retained earnings, so those accounts start the new year at zero.
- **Retained earnings.** The total net income the company has kept since it began, minus
  dividends. An equity account.
- **Opening balance.** An account's balance at the start of a period, carried forward from
  the prior period.

## Financial statements

- **Income statement (P&L).** Revenue minus expenses over a period. Shows whether the
  company made or lost money.
- **Balance sheet.** Assets, liabilities, and equity as of one date. Shows what the company
  owns and owes.
- **Cash flow statement.** How cash changed over a period, split into operating, investing,
  and financing activity.
- **Statement of changes in equity.** How each equity account moved over a period.
- **Period versus point in time.** Income and cash flow statements sum activity between two
  dates. A balance sheet sums all activity up to one date.
- **Trial balance.** Every account's balance as of a date. Total debits must equal total
  credits.
- **Comparative statement.** The same statement for two or more periods side by side.

## Income statement lines

- **Revenue.** Money earned from the company's main business.
- **Contra revenue.** Returns, refunds, and discounts that reduce revenue.
- **Net revenue.** Revenue minus contra revenue.
- **Cost of goods sold (COGS).** The direct cost of what was sold, such as materials or
  inventory.
- **Gross profit.** Net revenue minus COGS.
- **Gross margin.** Gross profit divided by net revenue.
- **Operating expenses (OpEx).** Costs of running the business that are not COGS, such as
  salaries, rent, and software.
- **Operating income.** Gross profit minus operating expenses.
- **Other income and expense.** Items outside the main business, such as interest earned or
  paid.
- **Net income.** The bottom line. Everything above it, added up with the right signs.
- **EBITDA.** Earnings before interest, taxes, depreciation, and amortization. A common
  non-GAAP measure of operating performance.

## Money

- **Currency.** The unit amounts are recorded in. Every amount belongs to exactly one.
- **Functional currency.** The main currency an entity keeps its books in.
- **Foreign exchange (FX).** Converting amounts between currencies at a rate, which creates
  gains or losses when rates move.
- **Exact decimals.** Money is stored as exact decimal amounts or integer cents, never
  binary floating point, so totals do not drift.
- **Rounding.** Done once, at a defined point, to the currency's smallest unit.
- **Negative amounts.** Accountants usually show them in parentheses, such as (650.25).

## Structure and control

- **Entity.** One legal company with its own books.
- **Consolidation.** Combining several entities' books into one set of statements.
- **Intercompany.** Transactions between entities of the same group. They are eliminated
  in consolidation.
- **Dimensions.** Tags on lines, such as department, class, or location, used to slice
  reports without adding accounts.
- **Reconciliation.** Checking that an account's balance matches an outside source, such as
  a bank statement.
- **GAAP.** Generally accepted accounting principles, the US rulebook for financial
  reporting. IFRS is the international equivalent.
- **Materiality.** Whether an amount is large enough to change a reader's decision.
- **Audit.** An independent review that the statements are fairly presented.
