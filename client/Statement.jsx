import { useId, useState } from 'react';
import { formatAmount } from '../shared/money.js';

function ReportRow({ label, number, amount, className, children }) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  return <>
    <tr className={className}>
      {number !== undefined && <td className="account-number">{number}</td>}
      <th scope="row" colSpan={number === undefined ? 2 : 1}>{label}</th>
      <td><button type="button" className="amount-toggle" aria-expanded={expanded} aria-controls={detailId}
        aria-label={`${formatAmount(amount)}: ${expanded ? 'Hide' : 'Show'} calculation for ${label}`} onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true" className="disclosure-arrow">{expanded ? '▾' : '▸'}</span>{formatAmount(amount)}
      </button></td>
    </tr>
    <tr className="calculation-row" hidden={!expanded}>
      <td colSpan="3"><div id={detailId} className="calculation" role="region" aria-label={`Calculation for ${label}`}>
        {children}
      </div></td>
    </tr>
  </>;
}

function Result({ label, amount }) {
  return <p className="calculation-result"><span>{label}</span><strong>{formatAmount(amount)}</strong></p>;
}

export function AccountCalculation({ account, currency, converted = false }) {
  const { rule, lines, roundingAdjustment = '0.00' } = account.calculation;
  return <>
    <p className="calculation-rule">{rule === 'credits-minus-debits' ? 'Credits − debits' : 'Debits − credits'} for each included line; then sum the contributions.</p>
    {currency && <p>All amounts below are in {currency}.</p>}
    {converted && <p>Source amounts are converted at the report's demonstration rate. The account total is rounded once; individual lines are rounded for display.</p>}
    {lines.length === 0 ? <p>No posted lines for this account in this period.</p> : <ul className="source-lines">
      {lines.map(line => <li key={`${line.entryIndex}:${line.lineNumber}`}>
        <p className="source-identity">{line.entryId} · {line.date} · {line.status} · source entry {line.entryIndex + 1}, line {line.lineNumber}</p>
        <p className="source-memo">{line.memo || 'No memo'}</p>
        <dl className="line-amounts">
          <div><dt>Debit</dt><dd>{formatAmount(line.debit)}</dd></div>
          <div><dt>Credit</dt><dd>{formatAmount(line.credit)}</dd></div>
          <div><dt>Contribution</dt><dd>{formatAmount(line.contribution)}</dd></div>
        </dl>
      </li>)}
    </ul>}
    {roundingAdjustment !== '0.00' && <Result label="Rounding adjustment" amount={roundingAdjustment} />}
    <Result label={roundingAdjustment === '0.00' ? 'Sum of contributions' : 'Sum of contributions plus rounding adjustment'} amount={account.amount} />
  </>;
}

function SumCalculation({ group, label }) {
  return <>
    <p className="calculation-rule">Sum of the account balances below. Expand an account amount above to see its journal lines.</p>
    {group.accounts.length === 0 ? <p>No accounts in this section.</p> : <ul className="formula-lines">
      {group.accounts.map(account => <li key={account.number}>
        <span>{account.number} · {account.name}</span><span>{formatAmount(account.amount)}</span>
      </li>)}
    </ul>}
    <Result label={label} amount={group.total} />
  </>;
}

export function FormulaCalculation({ calculation, label, amount }) {
  return <>
    <p className="calculation-rule">{calculation.operands[0].label} {calculation.operation === 'add' ? '+' : '−'} {calculation.operands[1].label}</p>
    <ul className="formula-lines">
      {calculation.operands.map((operand, index) => <li key={operand.label}>
        <span>{index > 0 && (calculation.operation === 'add' ? '+ ' : '− ')}{operand.label}</span>
        <span>{formatAmount(operand.amount)}</span>
      </li>)}
    </ul>
    <Result label={`= ${label}`} amount={amount} />
  </>;
}

function Profit({ label, field, report }) {
  return <ReportRow label={label} amount={report[field]} className="profit-row">
    <FormulaCalculation calculation={report.calculations[field]} label={label} amount={report[field]} />
  </ReportRow>;
}

function Section({ title, group, currency, converted }) {
  const totalLabel = `Total ${title.toLowerCase()}`;
  return <>
    <tr className="section-row"><th colSpan="3" scope="colgroup">{title}</th></tr>
    {group.accounts.map(account => <ReportRow key={account.number} number={account.number} label={account.name}
      amount={account.amount} className="account-row"><AccountCalculation account={account} currency={currency} converted={converted} /></ReportRow>)}
    <ReportRow label={totalLabel} amount={group.total} className="subtotal-row">
      <SumCalculation group={group} label={totalLabel} />
    </ReportRow>
  </>;
}

export default function Statement({ report }) {
  return <section className="statement" aria-label="Generated income statement">
    <table>
      <caption>
        <span>{report.period.start} to {report.period.end}</span>
        <span>Amounts in {report.currency} · Select any amount to see its calculation.</span>
        {report.exchangeRate && <span>Demonstration rate: 1 {report.exchangeRate.source} = {report.exchangeRate.rate} {report.currency}. All statement and calculation amounts are in {report.currency}.</span>}
      </caption>
      <thead><tr><th scope="col">Account</th><th scope="col">Name</th><th scope="col">Amount</th></tr></thead>
      <tbody>
        <Section title="Revenue" group={report.revenue} currency={report.currency} converted={Boolean(report.exchangeRate)} />
        <Section title="Cost of goods sold" group={report.costOfGoodsSold} currency={report.currency} converted={Boolean(report.exchangeRate)} />
        <Profit label="Gross profit" field="grossProfit" report={report} />
        <Section title="Operating expenses" group={report.operatingExpenses} currency={report.currency} converted={Boolean(report.exchangeRate)} />
        <Profit label="Operating income" field="operatingIncome" report={report} />
        <Section title="Other income" group={report.otherIncome} currency={report.currency} converted={Boolean(report.exchangeRate)} />
        <Profit label="Net income" field="netIncome" report={report} />
      </tbody>
    </table>
    <p className="report-note">Posted entries only. Both dates are included. Inactive and zero-balance accounts remain visible. Parentheses indicate negative amounts.</p>
  </section>;
}
