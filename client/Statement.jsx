import { formatAmount } from '../shared/money.js';

function Total({ label, amount, emphasis = false }) {
  return <tr className={emphasis ? 'profit-row' : 'subtotal-row'}>
    <th scope="row" colSpan="2">{label}</th><td>{formatAmount(amount)}</td>
  </tr>;
}

function Section({ title, group }) {
  return <>
    <tr className="section-row"><th colSpan="3" scope="colgroup">{title}</th></tr>
    {group.accounts.map(account => <tr key={account.number} className="account-row">
      <td className="account-number">{account.number}</td>
      <th scope="row">{account.name}</th>
      <td>{formatAmount(account.amount)}</td>
    </tr>)}
    <Total label={`Total ${title.toLowerCase()}`} amount={group.total} />
  </>;
}

export default function Statement({ report }) {
  return <section className="statement" aria-label="Generated income statement">
    <table>
      <caption>
        <span>{report.period.start} to {report.period.end}</span>
        <span>Amounts in {report.currency}</span>
      </caption>
      <thead><tr><th scope="col">Account</th><th scope="col">Name</th><th scope="col">Amount</th></tr></thead>
      <tbody>
        <Section title="Revenue" group={report.revenue} />
        <Section title="Cost of goods sold" group={report.costOfGoodsSold} />
        <Total label="Gross profit" amount={report.grossProfit} emphasis />
        <Section title="Operating expenses" group={report.operatingExpenses} />
        <Total label="Operating income" amount={report.operatingIncome} emphasis />
        <Section title="Other income" group={report.otherIncome} />
        <Total label="Net income" amount={report.netIncome} emphasis />
      </tbody>
    </table>
    <p className="report-note">Posted entries only. Both dates are included. Inactive and zero-balance accounts remain visible.</p>
  </section>;
}
