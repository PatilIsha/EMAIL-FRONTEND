import { useState } from 'react';

export default function App() {
  const [from, setFrom] = useState('');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pdf, setPdf] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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
          <div className="hint">Must match the SMTP user configured on the server.</div>
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

        <button type="submit" disabled={sending}>
          {sending ? 'Sending...' : `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
        </button>
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
