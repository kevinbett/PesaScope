import { useEffect, useRef, useState } from 'react'
import Loader from './components/Loader.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [data, setData] = useState(null)      // { meta, txns }
  const [isSample, setIsSample] = useState(false)
  const dashRef = useRef(null)

  const onParsed = (parsed, sample) => {
    setData(parsed)
    setIsSample(sample)
  }

  useEffect(() => {
    if (data && dashRef.current) dashRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data])

  return (
    <>
      <div className="flag-ribbon" aria-hidden="true" />
      <div className="wrap">
        <header>
          <h1>Pesa<span className="scope">Scope</span></h1>
          <div className="kanga" aria-hidden="true" />
          <p className="tagline">
            Your M-Pesa statement, decoded — <em>fedha zako, picha kamili</em>. Parsed entirely in your browser.
          </p>
        </header>

        <Loader onParsed={onParsed} />

        <div ref={dashRef}>
          {data && <Dashboard key={isSample + ':' + data.txns.length} data={data} isSample={isSample} />}
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
