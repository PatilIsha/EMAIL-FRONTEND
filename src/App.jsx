import { useState, useEffect, useRef } from 'react';

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
  const fileRef = useRef(null);

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
    if (fileRef.current) fileRef.current.value = '';
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
      setError('Please fill From, Subject, Message, and at least one valid recipient.');
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
    <div className="page">
      <main className="card">
        <header className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="m4 8 7.11 4.87a1.5 1.5 0 0 0 1.78 0L20 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="brand-text">
            <h1>Cold Mail Sender</h1>
            <p>Write once, reach everyone — send cold emails to your whole list in one click.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="from">From</label>
            <input
              id="from"
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder='"Your Name" <you@example.com>'
            />
            <span className="hint">Must match your verified sender email.</span>
          </div>

          <div className="field">
            <div className="field-head">
              <label htmlFor="to">Recipients</label>
              <span className={`badge ${recipientCount ? 'badge-ok' : ''}`}>
                {recipientCount} valid
              </span>
            </div>
            <textarea
              id="to"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              rows={3}
              placeholder="recruiter1@company.com, recruiter2@company.com&#10;recruiter3@company.com"
            />
            <span className="hint">Separate with commas, spaces, semicolons, or new lines.</span>
          </div>

          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A short, catchy subject line"
            />
          </div>

          <div className="field">
            <label htmlFor="body">Message</label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              placeholder="Write your cold email here…"
            />
          </div>

          <div className="field">
            <label>Attachment <span className="opt">(optional)</span></label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="file-input"
              onChange={(e) => setPdf(e.target.files?.[0] || null)}
            />
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {pdf ? (
                <span className="file-picked">
                  📄 {pdf.name}
                  <button
                    type="button"
                    className="file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdf(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span className="dz-text">
                  <strong>Click to attach a PDF</strong> — e.g. your resume
                </span>
              )}
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Sending…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                    <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  Send to {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
                </>
              )}
            </button>
            <button type="button" className="btn-ghost" onClick={clearForm} disabled={sending}>
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="report">
            <div className="stats">
              <div className="stat stat-ok">
                <b>{result.summary.sent}</b>
                <span>Sent</span>
              </div>
              <div className="stat stat-fail">
                <b>{result.summary.failed}</b>
                <span>Failed</span>
              </div>
              <div className="stat">
                <b>{result.summary.total}</b>
                <span>Total</span>
              </div>
            </div>
            <ul className="report-list">
              {result.results.map((r, i) => (
                <li key={i} className={r.status}>
                  <span className="dot" />
                  <span className="addr">{r.to}</span>
                  <span className="rstatus">
                    {r.status}
                    {r.error ? ` — ${r.error}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="foot">
        Sends via a verified sender · Your drafts are saved automatically
      </footer>
    </div>
  );
}
