import { useEffect, useMemo, useRef, useState } from 'react'
import Loader from './components/Loader.jsx'
import Dashboard from './components/Dashboard.jsx'
import { useMemory, applyMemory, mergeStatements } from './lib/memory.js'

export default function App() {
  // every loaded statement: { name, meta, summary, txns }
  const [statements, setStatements] = useState([])
  const [isSample, setIsSample] = useState(false)
  const [resetTick, setResetTick] = useState(0)
  const dashRef = useRef(null)
  const mem = useMemory()

  // merged + memory-applied view the dashboard renders
  const data = useMemo(() => {
    if (!statements.length) return null
    const txns = applyMemory(mergeStatements(statements), mem.memory)
    const first = statements[0].meta
    const period = statements.length === 1 ? first.period : (txns.length ? txns[0].date + ' → ' + txns[txns.length - 1].date : '')
    return { meta: { ...first, period }, txns, files: statements.map(s => ({ name: s.name, period: s.meta.period, n: s.txns.length })) }
  }, [statements, mem.memory])

  const goHome = () => {
    setStatements([]); setIsSample(false); setResetTick(t => t + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // parsed === null: a new file is being read — drop stale data. `mode` is 'replace' | 'add'.
  const onParsed = (parsed, sample = false, mode = 'replace') => {
    if (!parsed) { setStatements([]); setIsSample(false); return }
    setIsSample(!!sample)
    setStatements(prev => (mode === 'add' && !sample ? [...prev, parsed] : [parsed]))
  }
  const removeStatement = i => setStatements(prev => { const next = prev.filter((_, j) => j !== i); if (!next.length) setIsSample(false); return next })

  useEffect(() => {
    if (data && dashRef.current) dashRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [statements.length])

  // a refresh or tab close drops the statement (nothing is stored, by design): ask first,
  // but only when a real statement is loaded — never on the loader or the sample
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

        <Loader key={resetTick} onParsed={onParsed} loaded={!!data} isSample={isSample} loadedFiles={data && !isSample ? data.files : []} />

        <div ref={dashRef}>
          {data && (
            <Dashboard
              key={resetTick + ':' + isSample}
              data={data} isSample={isSample} mem={mem} onRemoveStatement={removeStatement}
              onLoadOwn={() => { document.getElementById('loader')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('fileInput')?.click() }}
            />
          )}
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
