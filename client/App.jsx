import { useEffect, useRef, useState } from 'react';
import { validateDateRange } from '../server/dates.js';
import Statement from './Statement.jsx';
import './styles.css';

const initialPeriod = { start: '2026-01-01', end: '2026-03-31' };
const requestTimeoutMs = 15_000;

export default function App() {
  const [draft, setDraft] = useState(initialPeriod);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeRequest = useRef(null);

  async function generate(period) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError('');
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, requestTimeoutMs);
    try {
      const response = await fetch(`/income-statement?${new URLSearchParams(period)}`, { signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Unable to generate the income statement.');
      if (activeRequest.current === controller && !controller.signal.aborted) setReport(body);
    } catch (failure) {
      // A timeout abort is visible; unmount/superseded-request aborts stay silent.
      if (activeRequest.current === controller && (!controller.signal.aborted || timedOut)) {
        if (timedOut) setError('The request timed out. Please try again.');
        else if (failure instanceof SyntaxError) setError('The server returned an unexpected response. Please try again.');
        else setError(failure instanceof TypeError ? 'Unable to reach the server. Check the connection and try again.' : failure.message);
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller && (!controller.signal.aborted || timedOut)) setLoading(false);
    }
  }

  useEffect(() => {
    generate(initialPeriod);
    return () => activeRequest.current?.abort();
  }, []);

  function submit(event) {
    event.preventDefault();
    if (loading) return;
    try { generate(validateDateRange(draft.start, draft.end)); }
    catch (failure) { setError(failure.message); }
  }

  return <main>
    <header>
      <p className="company">{report?.company ?? 'Northwind Coffee Roasters'}</p>
      <h1>Income statement</h1>
    </header>
    <form onSubmit={submit} aria-label="Statement period">
      <label>Start date
        <input type="date" required min="0001-01-01" max="9999-12-31" value={draft.start}
          onChange={event => setDraft({ ...draft, start: event.target.value })} />
      </label>
      <label>End date
        <input type="date" required min="0001-01-01" max="9999-12-31" value={draft.end}
          onChange={event => setDraft({ ...draft, end: event.target.value })} />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Generating…' : 'Generate statement'}</button>
    </form>
    <div className="request-status">
      {loading && <p role="status">Generating statement…{report ? ' The previous report remains below.' : ''}</p>}
      {error && <p role="alert">{error}{report ? ' The previous report remains below.' : ''}</p>}
    </div>
    {report && <Statement key={`${report.period.start}:${report.period.end}`} report={report} />}
  </main>;
}
