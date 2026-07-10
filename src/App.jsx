import { useState, useEffect } from 'react';

// Load any previously-typed draft so data survives page reloads, tab
// discards (long idle / Windows+L lock), and accidental closes.
const DRAFT_KEY = 'coldmail_draft';
function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}
const savedDraft = loadDraft();

export default function App() {
  const [from, setFrom] = useState(savedDraft.from || '');
  const [recipients, setRecipients] = useState(savedDraft.recipients || '');
  const [subject, setSubject] = useState(savedDraft.subject || '');
  const [body, setBody] = useState(savedDraft.body || '');
  const [pdf, setPdf] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Persist the draft on every change (text fields only — a PDF file
  // cannot be saved and must be re-attached after a reload).
  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ from, recipients, subject, body })
    );
  }, [from, recipients, subject, body]);

  function clearForm() {
    setFrom('');
    setRecipients('');
    setSubject('');
    setBody('');
    setPdf(null);
    setResult(null);
    setError('');
    localStorage.removeItem(DRAFT_KEY);
  }

  const recipientCount = recipients
    .split(/[\s,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!from || !subject || !body || recipientCount === 0) {
      setError('Please fill From, Subject, Body, and at least one valid recipient.');
      return;
    }

    const fd = new FormData();
    fd.append('from', from);
    fd.append('recipients', recipients);
    fd.append('subject', subject);
    fd.append('body', body);
    if (pdf) fd.append('pdf', pdf);

    setSending(true);
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API}/send`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container">
      <h1>Cold Mail Sender</h1>
      <p>Fill the email once, list multiple recipients, and send to all.</p>

      <form onSubmit={handleSubmit}>
        <label>
          From
          <input
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder='e.g. "Your Name" <you@example.com>'
          />
          <div className="hint">Must match your verified Brevo sender email.</div>
        </label>

        <label>
          To (multiple recipients)
          <textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            rows={4}
            placeholder="recruiter1@company.com, recruiter2@company.com&#10;recruiter3@company.com"
          />
          <div className="hint">
            Separate with commas, spaces, semicolons, or new lines. Detected:{' '}
            <strong>{recipientCount}</strong> valid email{recipientCount === 1 ? '' : 's'}.
          </div>
        </label>

        <label>
          Subject
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
          />
        </label>

        <label>
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Write your cold email here..."
          />
        </label>

        <label>
          Attach PDF (optional)
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] || null)}
          />
        </label>

        <div className="actions">
          <button type="submit" disabled={sending}>
            {sending ? 'Sending...' : `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
          </button>
          <button type="button" className="secondary" onClick={clearForm} disabled={sending}>
            Clear
          </button>
        </div>
      </form>

      {error && <div className="result failed"><strong>Error:</strong> {error}</div>}

      {result && (
        <div className="result">
          <h3>
            Sent {result.summary.sent} / {result.summary.total} ({result.summary.failed} failed)
          </h3>
          <ul>
            {result.results.map((r, i) => (
              <li key={i} className={r.status === 'sent' ? 'sent' : 'failed'}>
                {r.to} — {r.status}
                {r.error ? ` (${r.error})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
