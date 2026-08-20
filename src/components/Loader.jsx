import { useRef, useState } from 'react'
import { parsePdf, isPasswordError } from '../lib/parser.js'
import { makeSample } from '../lib/sample.js'

export default function Loader({ onParsed }) {
  const [armed, setArmed] = useState(false)
  const [needPw, setNeedPw] = useState(false)
  const [pw, setPw] = useState('')
  const [status, setStatus] = useState({ msg: '', err: false })
  const bufRef = useRef(null)
  const fileRef = useRef(null)

  async function tryOpen(buf, password) {
    setStatus({ msg: 'Reading PDF…', err: false })
    try {
      const parsed = await parsePdf(buf, password)
      if (!parsed.txns.length) {
        setStatus({ msg: 'Opened the PDF but found no transaction rows — is this the M-PESA “Full Statement” export?', err: true })
        return
      }
      setNeedPw(false)
      setStatus({ msg: `Imesomeka ✓ — parsed ${parsed.txns.length} transactions`, err: false })
      onParsed(parsed, false)
    } catch (e) {
      if (isPasswordError(e)) {
        bufRef.current = buf
        setNeedPw(true)
        setStatus({
          msg: password
            ? 'That password didn’t work — try again. It’s usually your national ID number.'
            : 'This statement is password-protected — enter the password to unlock it.',
          err: !!password,
        })
      } else {
        setStatus({ msg: 'Couldn’t read that PDF: ' + (e.message || e), err: true })
      }
    }
  }

  function handleFile(file) {
    if (!file) return
    if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus({ msg: 'That doesn’t look like a PDF.', err: true })
      return
    }
    const rd = new FileReader()
    rd.onload = () => { bufRef.current = rd.result; tryOpen(rd.result, pw) }
    rd.readAsArrayBuffer(file)
  }

  const unlock = () => { if (bufRef.current) tryOpen(bufRef.current, pw) }

  return (
    <section className="panel" id="loader">
      <div
        id="dropzone"
        className={armed ? 'armed' : ''}
        tabIndex={0}
        role="button"
        aria-label="Choose or drop your M-Pesa statement PDF"
        onClick={() => fileRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
        onDragOver={e => { e.preventDefault(); setArmed(true) }}
        onDragEnter={e => { e.preventDefault(); setArmed(true) }}
        onDragLeave={e => { e.preventDefault(); setArmed(false) }}
        onDrop={e => { e.preventDefault(); setArmed(false); handleFile(e.dataTransfer.files[0]) }}
      >
        <div className="big">Drop your M-Pesa statement PDF here — <em>dondosha hapa</em></div>
        <div className="sub">or click to choose the file — then enter the statement password if it asks</div>
      </div>
      <input
        type="file" id="fileInput" ref={fileRef}
        accept="application/pdf,.pdf" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      {needPw && (
        <div id="pwRow" className="show">
          <label htmlFor="pw">Statement password</label>
          <input
            type="password" id="pw" autoComplete="off" placeholder="usually your ID number"
            value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') unlock() }}
            autoFocus
          />
          <button className="btn primary" onClick={unlock}>Unlock</button>
        </div>
      )}
      <div id="status" role="status" className={status.err ? 'err' : ''}>{status.msg}</div>
      <div className="privacy">
        <span className="dot">●</span>
        <span>
          The PDF is decrypted and read on this device only — nothing is uploaded anywhere.
          No trace of your statement leaves this page. Don’t trust it? Close the tab; nothing persists.{' '}
          <button
            className="btn link"
            onClick={() => {
              setStatus({ msg: 'Showing a sample statement — drop your own PDF any time.', err: false })
              onParsed(makeSample(), true)
            }}
          >Or explore with a sample statement</button>
        </span>
      </div>
    </section>
  )
}
