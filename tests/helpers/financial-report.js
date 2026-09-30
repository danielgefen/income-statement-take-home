// Keep the independent financial fixture unchanged as trace metadata is added.
export function financialReport(report) {
  const { calculations, ...financial } = report;
  for (const section of ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome']) {
    financial[section] = {
      total: report[section].total,
      accounts: report[section].accounts.map(({ calculation, ...account }) => account),
    };
  }
  return financial;
}
