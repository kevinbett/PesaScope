import { forwardRef } from 'react'
import { fmt, monthLbl } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'
import HBars from './HBars.jsx'
import Section from './Section.jsx'

const Charges = forwardRef(function Charges({ report, onShowAll, onPick, showTip, hideTip }, ref) {
  const r = report
  const maxM = Math.max(...r.byMonth.map(m => m[1]), 1)
  const typeTotal = r.byType.reduce((s, e) => s + e[1], 0) || 1
  return (
    <Section id="charges" title="What M-PESA charged you" innerRef={ref} className="charges">
      {r.n === 0 ? <p className="chart-note">No charges in this period.</p> : (
        <>
          <div className="charges-head">
            <div className="charges-total">
              <span className="lbl">Total charges <span className="sw-lbl">makato yote</span></span>
              <span className="fig negv">KES {fmt(r.total)}</span>
              <span className="sub">{r.n.toLocaleString()} fees · {r.pct.toFixed(2)}% of everything you paid out · about KES {fmt(r.perDay)} a day</span>
            </div>
            <div className="charges-facts">
              {r.sends && (
                <div className="fact">
                  <strong>KES {fmt(r.sends.avgFee)}</strong> average fee per send
                  <span>{r.sends.free} of {r.sends.n} sends were free · fees average {r.sends.avgPct.toFixed(1)}% of the amount sent</span>
                </div>
              )}
              {r.biggest && (
                <div className="fact">
                  <strong>KES {fmt(r.biggest.withdrawn)}</strong> biggest single fee
                  <span>{r.biggest.date}{r.biggest.parentWho ? ' · ' + titleCase(r.biggest.parentWho) : ''}</span>
                </div>
              )}
              <div className="fact">
                <strong>{r.byType[0] ? r.byType[0][0] : '—'}</strong> costs you the most
                <span>{r.byType[0] ? `KES ${fmt(r.byType[0][1])} across ${r.byType[0][2].toLocaleString()} fees` : ''}</span>
              </div>
            </div>
          </div>

          {r.byMonth.length > 1 && (
            <div className="charges-months" role="img" aria-label="Charges by month">
              {r.byMonth.map(([k, v, n, o]) => (
                <div
                  className="cm"
                  key={k}
                  onMouseMove={ev => showTip(<><strong>{monthLbl(k)}</strong><br />KES {fmt(v)} in {n} fee{n === 1 ? '' : 's'}{o ? ` · ${((v / o) * 100).toFixed(2)}% of that month's outflow` : ''}</>, ev)}
                  onMouseLeave={hideTip}
                >
                  <span className="cm-val">{v ? fmt(v) : ''}</span>
                  <span className="cm-bar"><span style={{ height: ((v / maxM) * 100).toFixed(1) + '%' }} /></span>
                  <span className="cm-lbl">{monthLbl(k).slice(0, 3)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="charges-grid">
            <div>
              <h3>By fee type</h3>
              <HBars entries={r.byType.map(e => [e[0], e[1]])} total={typeTotal} tipLabel="of charges" showTip={showTip} hideTip={hideTip} />
            </div>
            <div>
              <h3>By what you were paying for</h3>
              <HBars entries={r.byParent.map(e => [e[0], e[1]])} total={typeTotal} tipLabel="of charges" showTip={showTip} hideTip={hideTip} />
            </div>
          </div>

          {r.topPeople.length > 0 && (
            <>
              <h3>Sending to these people cost the most</h3>
              <ol className="plist compact">
                {r.topPeople.map((p, i) => (
                  <li key={p.key}>
                    <button className="prow" onClick={() => onPick(p)}>
                      <span className="prank">{i + 1}</span>
                      <span className="pmain">
                        <span className="pname">{titleCase(p.name)}</span>
                        <span className="pmeta">{p.n} send{p.n === 1 ? '' : 's'} · KES {fmt(p.sent)} sent · {((p.fees / p.sent) * 100).toFixed(1)}% in fees</span>
                      </span>
                      <span className="pamt">KES {fmt(p.fees)}<small>in fees</small></span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="more-row">
            <button className="btn" onClick={onShowAll}>See every charge row</button>
            <span className="more-note">Fuliza's daily fee is folded into your repayments and isn't itemised by Safaricom, so it isn't counted here.</span>
          </div>
        </>
      )}
    </Section>
  )
})
export default Charges
