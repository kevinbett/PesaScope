import { useEffect, useRef, useState } from 'react'
import Loader from './components/Loader.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [data, setData] = useState(null)      // { meta, txns }
  const [isSample, setIsSample] = useState(false)
  const [resetTick, setResetTick] = useState(0)
  const dashRef = useRef(null)

  // the wordmark is the home button: drop the statement, reset every panel, back to top
  const goHome = () => {
    setData(null)
    setIsSample(false)
    setResetTick(t => t + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // parsed === null means "a new file is being read": drop whatever is on screen
  // immediately so stale (or sample) data can never be mistaken for the new statement
  const onParsed = (parsed, sample) => {
    setData(parsed)
    setIsSample(!!parsed && !!sample)
  }

  useEffect(() => {
    if (data && dashRef.current) dashRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data])

  // a refresh or tab close drops the statement (nothing is stored, by design):
  // ask first — but only when a real statement is loaded, never on the loader or the sample
  useEffect(() => {
    if (!data || isSample) return
    const guard = e => { e.preventDefault(); e.returnValue = 'Refreshing will clear your statement — you will need to upload the PDF again.' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [data, isSample])

  return (
    <>
      <div className="flag-ribbon" aria-hidden="true" />
      <div className="wrap">
        <header>
          <button className="homelink" onClick={goHome} title="Back to start" aria-label="PesaScope — back to start">
            <h1>Pesa<span className="scope">Scope</span></h1>
          </button>
          <div className="kanga" aria-hidden="true" />
          <p className="tagline">
            Your M-Pesa statement, decoded — <em>fedha zako, picha kamili</em>. Parsed entirely in your browser.
          </p>
        </header>

        <Loader key={resetTick} onParsed={onParsed} loaded={!!data} isSample={isSample} />

        <div ref={dashRef}>
          {data && <Dashboard key={resetTick + ':' + isSample + ':' + data.txns.length} data={data} isSample={isSample} onLoadOwn={() => { document.getElementById('loader')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('fileInput')?.click() }} />}
        </div>

        <footer>
          PesaScope reads Safaricom’s “M-PESA Full Statement” PDF layout. Categories are inferred from
          each row’s details text, so an odd transaction may land in “Other”. This is a personal
          analysis tool, not financial advice, and it is not affiliated with Safaricom.
        </footer>
      </div>
    </>
  )
}
