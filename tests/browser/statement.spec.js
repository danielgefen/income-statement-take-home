import { test, expect } from '@playwright/test';

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const amount = (page, label) => page.getByRole('button', { name: new RegExp(`: (?:Show|Hide) calculation for ${escape(label)}$`) });
const details = (page, label) => page.getByRole('region', { name: `Calculation for ${label}`, exact: true });
const caption = page => page.getByRole('table').getByRole('caption');
const apiRequest = request => new URL(request.url()).pathname === '/income-statement';
const periodOf = request => Object.fromEntries(new URL(request.url()).searchParams);

async function expectAmount(page, label, value) {
  await expect(amount(page, label)).toHaveText(new RegExp(`^[▸▾]${escape(value)}$`));
}

async function openQ1(page) {
  await page.goto('/');
  await expectAmount(page, 'Net income', '(44,480.14)');
  await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
}

async function setPeriod(page, start, end) {
  await page.getByLabel('Start date', { exact: true }).fill(start);
  await page.getByLabel('End date', { exact: true }).fill(end);
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Wrong UI wiring/formatting must fail even if the calculator's unit tests pass.
test('the real API renders every Q1 account and total, with usable calculation disclosures', async ({ page }, testInfo) => {
  await openQ1(page);
  for (const [label, value] of [
    ['Product Revenue', '35,650.75'], ['Subscription Revenue', '3,000.00'],
    ['Sales Returns & Discounts', '(800.25)'], ['Total revenue', '37,850.50'],
    ['Cost of Goods Sold', '14,272.75'], ['Total cost of goods sold', '14,272.75'],
    ['Gross profit', '23,577.75'], ['Salaries', '55,500.00'], ['Rent', '9,000.00'],
    ['Software', '1,099.97'], ['Marketing (legacy)', '2,500.10'],
    ['Total operating expenses', '68,100.07'], ['Operating income', '(44,522.32)'],
    ['Interest Income', '42.18'], ['Total other income', '42.18'], ['Net income', '(44,480.14)'],
  ]) await expectAmount(page, label, value);

  if (testInfo.project.name === 'phone') await amount(page, 'Software').tap();
  else await amount(page, 'Software').press('Enter');
  await expect(amount(page, 'Software')).toHaveAttribute('aria-expanded', 'true');
  await expect(details(page, 'Software')).toContainText('JE-018');
  await expect(details(page, 'Software')).toContainText('JE-020');
  await expect(details(page, 'Software')).toContainText('Debits − credits');
  await expect(details(page, 'Software')).toContainText('(100.00)');
  await expect(details(page, 'Software').getByText('Sum of contributions', { exact: true })).toBeVisible();
  await expect(details(page, 'Software').getByText('1,099.97', { exact: true })).toBeVisible();
  await expect(amount(page, 'Software')).toHaveAccessibleName('1,099.97: Hide calculation for Software');

  await amount(page, 'Total operating expenses').click();
  await expect(details(page, 'Total operating expenses')).toContainText('6300 · Marketing (legacy)');
  await expect(details(page, 'Total operating expenses')).toContainText('68,100.07');
  await amount(page, 'Net income').click();
  await expect(details(page, 'Net income')).toContainText('Operating income + Total other income');
  await expect(details(page, 'Net income')).toContainText('(44,522.32)');
  await expect(details(page, 'Net income')).toContainText('42.18');
  await expect(details(page, 'Net income')).toContainText('(44,480.14)');

  // Horizontal overflow makes the statement unusable at phone width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await amount(page, 'Software').press('Space');
  await expect(amount(page, 'Software')).toHaveAttribute('aria-expanded', 'false');
  await expect(details(page, 'Software')).toBeHidden();
});

// Catches auto-submission, hard-coded query dates, stale totals/details, or labels from draft inputs.
test('editing dates waits for submission, then March amounts and explanations agree', async ({ page }) => {
  await openQ1(page);
  await amount(page, 'Product Revenue').click();
  const requests = [];
  page.on('request', request => { if (apiRequest(request)) requests.push(periodOf(request)); });
  await setPeriod(page, '2026-03-01', '2026-03-31');
  await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
  await expectAmount(page, 'Net income', '(44,480.14)');
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
  await expect(caption(page)).toContainText('2026-03-01 to 2026-03-31');
  await expectAmount(page, 'Product Revenue', '15,000.00');
  await expectAmount(page, 'Net income', '(9,720.24)');
  expect(requests).toEqual([{ start: '2026-03-01', end: '2026-03-31' }]);
  await expect(amount(page, 'Product Revenue')).toHaveAttribute('aria-expanded', 'false');
  await amount(page, 'Product Revenue').click();
  await expect(details(page, 'Product Revenue')).toContainText('JE-016');
  await expect(details(page, 'Product Revenue')).not.toContainText('JE-002');
  await expect(details(page, 'Product Revenue')).not.toContainText('JE-010');
  await amount(page, 'Net income').click();
  await expect(details(page, 'Net income')).toContainText('(9,762.42)');
  await expect(details(page, 'Net income')).toContainText('(9,720.24)');
});

test('a same-day empty period is a zero statement with explicit empty explanations', async ({ page }) => {
  await openQ1(page);
  await setPeriod(page, '2030-01-01', '2030-01-01');
  await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
  await expect(caption(page)).toContainText('2030-01-01 to 2030-01-01');
  await expectAmount(page, 'Net income', '0.00');
  await expect(page.getByRole('button', { name: /^0\.00: Show calculation for / })).toHaveCount(16);
  await amount(page, 'Software').click();
  await expect(details(page, 'Software')).toContainText('No posted lines for this account in this period.');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('invalid and missing dates do not send requests or discard the displayed report', async ({ page }) => {
  await openQ1(page);
  const requests = [];
  page.on('request', request => { if (apiRequest(request)) requests.push(request.url()); });
  await setPeriod(page, '2026-04-01', '2026-03-31');
  await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Start date must be on or before end date.');
  await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
  await expectAmount(page, 'Net income', '(44,480.14)');
  await page.getByLabel('Start date', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
  expect(await page.getByLabel('Start date', { exact: true }).evaluate(input => input.validity.valueMissing)).toBe(true);
  expect(requests).toEqual([]);
  await expectAmount(page, 'Net income', '(44,480.14)');
});

for (const failure of ['network', 'http']) {
  test(`${failure} failure preserves the prior report and allows a successful retry`, async ({ page }) => {
    await openQ1(page);
    await amount(page, 'Software').click();
    // Only transport failure is simulated. Retry goes to the real Express calculator.
    await page.route('**/income-statement?*', async route => {
      if (failure === 'network') await route.abort('failed');
      else await route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Unable to generate the income statement.' } }) });
    }, { times: 1 });
    await setPeriod(page, '2026-03-01', '2026-03-31');
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(failure === 'network' ? 'Unable to reach the server.' : 'Unable to generate the income statement.');
    await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
    await expectAmount(page, 'Net income', '(44,480.14)');
    await expect(details(page, 'Software')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate statement', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await expectAmount(page, 'Net income', '(9,720.24)');
    await expect(caption(page)).toContainText('2026-03-01 to 2026-03-31');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

// A non-JSON response must not expose a parser exception or prevent retry.
for (const status of [200, 503]) {
  test(`non-JSON HTTP ${status} shows a friendly error and permits retry`, async ({ page }) => {
    await openQ1(page);
    await page.route('**/income-statement?*', route => route.fulfill({
      status, contentType: 'text/html', body: '<html>Unexpected upstream response</html>',
    }), { times: 1 });
    await setPeriod(page, '2026-03-01', '2026-03-31');
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('The server returned an unexpected response. Please try again.');
    await expectAmount(page, 'Net income', '(44,480.14)');
    await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await expectAmount(page, 'Net income', '(9,720.24)');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

// Removing the timeout or merely hiding the spinner must fail this test:
// the real fetch must abort, the prior report must survive, and retry must work.
for (const initial of [true, false]) {
  test(`${initial ? 'initial' : 'subsequent'} request times out after 15 seconds and permits retry`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    if (!initial) await openQ1(page);
    const received = deferred();
    const release = deferred();
    const aborted = page.waitForEvent('requestfailed', { predicate: apiRequest });
    await page.route('**/income-statement?*', async route => {
      received.resolve();
      await release.promise;
      await route.abort('failed');
    }, { times: 1 });
    try {
      if (initial) await page.goto('/');
      else {
        await setPeriod(page, '2026-03-01', '2026-03-31');
        await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
      }
      await received.promise;
      await page.clock.runFor(14_999);
      await expect(page.getByRole('button', { name: 'Generating…', exact: true })).toBeDisabled();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await page.clock.runFor(1);
      await expect(page.getByRole('alert')).toContainText('The request timed out. Please try again.');
      await aborted;
      await expect(page.getByRole('button', { name: 'Generate statement', exact: true })).toBeEnabled();
      if (initial) await expect(page.getByRole('table')).toHaveCount(0);
      else {
        await expectAmount(page, 'Net income', '(44,480.14)');
        await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
      }
      release.resolve();
      await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
      await expectAmount(page, 'Net income', initial ? '(44,480.14)' : '(9,720.24)');
      await expect(page.getByRole('alert')).toHaveCount(0);
      await page.clock.runFor(15_000);
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Generate statement', exact: true })).toBeEnabled();
    } finally {
      release.resolve();
      // Observe the event promise on a failing pre-fix run as well.
      aborted.catch(() => {});
    }
  });
}

// No sleep-based racing: hold an actual API response until assertions explicitly release it.
// The current UI prevents concurrent submissions; this checks that guard, not an unreachable race.
test('a delayed request blocks resubmission and remains bound to its submitted dates', async ({ page }) => {
  await openQ1(page);
  const received = deferred();
  const release = deferred();
  const requests = [];
  page.on('request', request => { if (apiRequest(request)) requests.push(periodOf(request)); });
  await page.route('**/income-statement?*', async route => {
    const response = await route.fetch();
    received.resolve();
    await release.promise;
    await route.fulfill({ response });
  }, { times: 1 });
  try {
    await setPeriod(page, '2026-03-01', '2026-03-31');
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await received.promise;
    await expect(page.getByRole('status')).toContainText('Generating statement');
    await expect(page.getByRole('button', { name: 'Generating…', exact: true })).toBeDisabled();
    await expectAmount(page, 'Net income', '(44,480.14)');
    await setPeriod(page, '2030-01-01', '2030-01-31');
    await page.getByLabel('End date', { exact: true }).press('Enter');
    await expect(caption(page)).toContainText('2026-01-01 to 2026-03-31');
    expect(requests).toEqual([{ start: '2026-03-01', end: '2026-03-31' }]);
    release.resolve();
    await expectAmount(page, 'Net income', '(9,720.24)');
    await expect(caption(page)).toContainText('2026-03-01 to 2026-03-31');
    await expect(page.getByLabel('Start date', { exact: true })).toHaveValue('2030-01-01');
    await expect(page.getByRole('status')).toHaveCount(0);
    expect(requests).toHaveLength(1);
    await amount(page, 'Net income').click();
    await expect(details(page, 'Net income')).toContainText('(9,720.24)');
    await page.getByRole('button', { name: 'Generate statement', exact: true }).click();
    await expect(caption(page)).toContainText('2030-01-01 to 2030-01-31');
    await expectAmount(page, 'Net income', '0.00');
    expect(requests).toEqual([
      { start: '2026-03-01', end: '2026-03-31' }, { start: '2030-01-01', end: '2030-01-31' },
    ]);
  } finally { release.resolve(); }
});
