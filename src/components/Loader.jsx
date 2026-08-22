import { useRef, useState } from 'react'
import { parsePdf, isPasswordError } from '../lib/parser.js'
import { makeSample } from '../lib/sample.js'

export default function Loader({ onParsed, loaded = false, isSample = false, loadedFiles = [] }) {
  // with a real statement on screen, a new file is read first and then the user chooses Add or Replace;
  // with the sample (or nothing) on screen, the screen is cleared as soon as a file is chosen
  const keepExisting = loaded && !isSample
  const clearShown = () => { if (!keepExisting) onParsed(null, false) }
  const [pending, setPending] = useState(null)   // { parsed, name } awaiting Add / Replace
  const [armed, setArmed] = useState(false)
  const [needPw, setNeedPw] = useState(false)
  const [pw, setPw] = useState('')
  const [status, setStatus] = useState({ msg: '', err: false })
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const bufRef = useRef(null)
  const nameRef = useRef('')
  const fileRef = useRef(null)

  async function tryOpen(buf, password) {
    setStatus({ msg: 'Reading PDF…', err: false })
    setBusy(true)
    try {
      const parsed = await parsePdf(buf, password)
      if (!parsed.txns.length) {
        setStatus({ msg: 'Opened the PDF but found no transaction rows — is this the M-PESA “Full Statement” export?', err: true })
        return
      }
      setNeedPw(false)
      setStatus({ msg: `Imesomeka ✓ — parsed ${parsed.txns.length} transactions`, err: false })
      const name = nameRef.current || 'statement.pdf'
      if (keepExisting) setPending({ parsed: { ...parsed, name }, name })
      else onParsed({ ...parsed, name }, false)
    } catch (e) {
      if (isPasswordError(e)) {
        bufRef.current = buf
        setNeedPw(true)
        setStatus({
          msg: password
            ? 'That PIN didn’t work — check the SMS Safaricom sent when you requested the statement and try again.'
            : 'This statement is locked — enter the PIN from Safaricom’s SMS to open it.',
          err: !!password,
        })
      } else {
        setStatus({ msg: 'Couldn’t read that PDF: ' + (e.message || e), err: true })
      }
    } finally {
      setBusy(false)
    }
  }

  function handleFile(file) {
    if (!file) return
    if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus({ msg: 'That doesn’t look like a PDF.', err: true })
      return
    }
    setFileName(file.name); nameRef.current = file.name
    clearShown()
    const rd = new FileReader()
    rd.onload = () => { bufRef.current = rd.result; tryOpen(rd.result, pw) }
    rd.readAsArrayBuffer(file)
  }

  const unlock = () => { if (bufRef.current) { clearShown(); tryOpen(bufRef.current, pw) } }

  return (
    <section className="panel" id="loader">
      <div
        id="dropzone"
        className={'dz' + (armed ? ' armed' : '') + (busy ? ' busy' : '') + (needPw ? ' locked' : '')}
        tabIndex={needPw ? -1 : 0}
        role={needPw ? undefined : 'button'}
        aria-label={needPw ? undefined : 'Choose or drop your M-Pesa statement PDF'}
        onClick={needPw ? undefined : () => fileRef.current?.click()}
        onKeyDown={needPw ? undefined : e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
        onDragOver={e => { e.preventDefault(); setArmed(true) }}
        onDragEnter={e => { e.preventDefault(); setArmed(true) }}
        onDragLeave={e => { e.preventDefault(); setArmed(false) }}
        onDrop={e => { e.preventDefault(); setArmed(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <DocIllustration locked={needPw} busy={busy} />
        {needPw ? (
          <div className="dz-body" onClick={e => e.stopPropagation()}>
            <div className="dz-title">This statement is locked</div>
            <div className="dz-sub">Enter the PIN Safaricom sent you by SMS{fileName ? <> for <span className="mono">{fileName}</span></> : ''}.</div>
            <div className="pwrow">
              <input
                type="password" id="pw" autoComplete="off" inputMode="numeric" placeholder="Statement PIN"
                aria-label="Statement password"
                value={pw} onChange={e => setPw(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') unlock() }}
                autoFocus
              />
              <button className="btn primary" onClick={unlock} disabled={busy || !pw}>{busy ? 'Reading…' : 'Unlock'}</button>
            </div>
            <button className="btn link" onClick={() => { bufRef.current = null; setNeedPw(false); setPw(''); setFileName(''); setStatus({ msg: '', err: false }); fileRef.current?.click() }}>Choose a different file</button>
          </div>
        ) : (
          <div className="dz-body">
            <div className="dz-title">{armed ? 'Release to read it' : busy ? 'Reading your statement…' : 'Drop your M-PESA statement here'}</div>
            <div className="dz-sub">{armed ? 'dondosha hapa' : <>or <em>dondosha hapa</em> — drag the PDF anywhere into this box</>}</div>
            <button type="button" className="btn primary dz-cta" tabIndex={-1} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 11V3m0 0L4.5 6.5M8 3l3.5 3.5M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Choose PDF
            </button>
            <div className="dz-hint">{loaded ? (isSample ? 'Drop your own statement to replace the sample' : 'Drop another statement to replace the one loaded') : 'PDF · the “M-PESA Full Statement” Safaricom emails you'}</div>
          </div>
        )}
        {busy && <div className="dz-progress" aria-hidden="true"><span /></div>}
      </div>
      <input
        type="file" id="fileInput" ref={fileRef}
        accept="application/pdf,.pdf" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      <div id="status" role="status" className={status.err ? 'err' : ''}>{status.msg}</div>
      {pending && (
        <div className="pending" role="group" aria-label="What to do with the new statement">
          <div className="pending-text">
            <strong>{pending.parsed.meta.period || 'New statement'}</strong> · {pending.parsed.txns.length.toLocaleString()} transactions read.
            You already have {loadedFiles.length} statement{loadedFiles.length === 1 ? '' : 's'} loaded ({loadedFiles.map(f => f.period).join(' · ')}).
          </div>
          <div className="pending-actions">
            <button className="btn primary" onClick={() => { onParsed(pending.parsed, false, 'add'); setPending(null); setStatus({ msg: 'Added — overlapping transactions are counted once.', err: false }) }}>Add to what’s loaded</button>
            <button className="btn" onClick={() => { onParsed(pending.parsed, false, 'replace'); setPending(null); setStatus({ msg: 'Replaced.', err: false }) }}>Replace</button>
            <button className="btn link" onClick={() => { setPending(null); setStatus({ msg: '', err: false }) }}>Cancel</button>
          </div>
        </div>
      )}

      {!loaded && <ol className="steps" aria-label="How to get your statement">
        <li><span className="n">1</span><span><strong>Request it</strong><br />M-PESA app → Statements → pick the months. Safaricom emails the PDF and texts you a PIN.</span></li>
        <li><span className="n">2</span><span><strong>Drop it above</strong><br />or tap Choose PDF and pick the file from Downloads or Mail.</span></li>
        <li><span className="n">3</span><span><strong>Enter the PIN</strong><br />from the SMS. The PDF is unlocked on this device — never uploaded.</span></li>
      </ol>}

      <div className="privacy">
        <svg className="shield" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l5 2v4c0 3.2-2.1 5.6-5 7-2.9-1.4-5-3.8-5-7v-4l5-2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5.6 8l1.7 1.7L10.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span>
          Decrypted and read on this device only — nothing is uploaded, nothing persists after you close the tab.
          {!loaded && <>{' '}
            <button
              className="btn link"
              onClick={() => {
                setStatus({ msg: 'Showing a sample statement — drop your own PDF any time.', err: false })
                onParsed(makeSample(), true)
              }}
            >Explore with a sample statement instead</button>
          </>}
        </span>
      </div>
    </section>
  )
}

/** a little statement page: folded corner, kanga stripe, text lines, lock badge when locked */
function DocIllustration({ locked, busy }) {
  return (
    <div className={'doc' + (locked ? ' doc-locked' : '') + (busy ? ' doc-busy' : '')} aria-hidden="true">
      <svg viewBox="0 0 88 108" width="88" height="108">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--doc-top)" /><stop offset="1" stopColor="var(--doc-bot)" /></linearGradient>
        </defs>
        <path d="M8 4h52l20 20v76a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="url(#pg)" stroke="var(--doc-edge)" strokeWidth="1.5" />
        <path d="M60 4v16a4 4 0 0 0 4 4h16" fill="var(--doc-fold)" stroke="var(--doc-edge)" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="14" y="30" width="28" height="5" rx="2.5" fill="var(--accent)" />
        <rect x="14" y="44" width="56" height="3" rx="1.5" fill="var(--doc-line)" />
        <rect x="14" y="53" width="48" height="3" rx="1.5" fill="var(--doc-line)" />
        <rect x="14" y="62" width="56" height="3" rx="1.5" fill="var(--doc-line)" />
        <rect x="14" y="71" width="36" height="3" rx="1.5" fill="var(--doc-line)" />
        <rect x="14" y="84" width="22" height="4" rx="2" fill="var(--series-in)" opacity=".8" />
        <rect x="42" y="84" width="28" height="4" rx="2" fill="var(--series-out)" opacity=".8" />
      </svg>
      <span className="badge">
        {locked
          ? <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor" /><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          : <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v8m0 0l-3-3m3 3l3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
    </div>
  )
}
