import { fmt } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'

export default function Merchants({ merchants, onPick }) {
  if (!merchants.length) return null
  const max = Math.max(...merchants.map(m => m.total), 1)
  return (
    <section className="panel">
      <h2>Top merchants &amp; bills</h2>
      <p className="lede">Where the Buy Goods and PayBill money goes, grouped by brand.</p>
      <ol className="plist">
        {merchants.map((m, i) => (
          <li key={m.key}>
            <button className="prow" onClick={() => onPick(m)} title={'Show every payment to ' + titleCase(m.key)}>
              <span className="prank">{i + 1}</span>
              <span className="pmain">
                <span className="pname">{titleCase(m.key)}<span className="ptag">{m.cat.replace(' (Till)', '')}</span></span>
                <span className="pmeta">
                  {m.n} payment{m.n === 1 ? '' : 's'}{m.code ? ` · ${m.cat === 'PayBill' ? 'PayBill' : 'Till'} ${m.code}` : ''}
                  {m.fulizaN ? ` · ${m.fulizaN} on Fuliza` : ''}{m.fees > 0 ? ` · KES ${fmt(m.fees)} fees` : ''} · last {m.last}
                </span>
                <span className="pbar"><span style={{ width: ((m.total / max) * 100).toFixed(1) + '%' }} /></span>
              </span>
              <span className="pamt">KES {fmt(m.total)}<small>avg {fmt(m.total / m.n)}</small></span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
