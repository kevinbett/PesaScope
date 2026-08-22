import { useEffect, useState } from 'react'
import { fmt } from '../lib/format.js'
import { titleCase, splitTerms } from '../lib/insights.js'
import HBars from './HBars.jsx'
import TxnTable from './TxnTable.jsx'

/** distinct counterparties among the matched rows (charges count toward their parent) */
function counterparties(rows) {
  const m = new Map()
  for (const t of rows) {
    const key = t.isCharge ? (t.parentKey || t.key) : t.key
    const name = t.isCharge ? (t.parentWho || t.who) : t.who
    const c = m.get(key) || { key, name, phone: t.phone, n: 0, sent: 0, recv: 0, last: t.date }
    if (!t.isCharge) { c.n++; c.sent += t.withdrawn; c.recv += t.paidIn; if (t.date > c.last) c.last = t.date; if (!c.phone && t.phone) c.phone = t.phone }
    m.set(key, c)
  }
  return [...m.values()].sort((a, b) => (b.sent + b.recv) - (a.sent + a.recv))
}

export default function SearchResults({ q, result, cat, setCat, setQ, showTip, hideTip, onPick, meta, context }) {
  const r = result
  const [combine, setCombine] = useState(false)
  useEffect(() => { setCombine(false) }, [q])
  const parties = counterparties(r.rows)
  const ambiguous = r.terms.length === 1 && parties.length > 1 && !combine
  const tiles = [
    { lbl: 'You sent', v: fmt(r.sent), sub: `KES · ${r.sentN} transfer${r.sentN === 1 ? '' : 's'} to people`, cls: '' },
    { lbl: 'You received', v: fmt(r.recv), sub: `KES · ${r.recvN} receipt${r.recvN === 1 ? '' : 's'} from people`, cls: 'pos' },
    { lbl: 'All money out', v: fmt(r.out), sub: `KES · ${r.rows.filter(t => t.withdrawn > 0).length} rows incl. bills & fees`, cls: '' },
    { lbl: 'All money in', v: fmt(r.inn), sub: `KES · ${r.rows.filter(t => t.paidIn > 0).length} rows`, cls: 'pos' },
  ]
  const catTotal = r.cats.out.reduce((s, [, v]) => s + v, 0) || 1
  return (
    <div className="search-results">
      <div className="dash-head">
        <span className="who">{r.terms.length > 1 ? 'Results for ' + r.terms.length + ' terms' : 'Results for “' + r.terms[0].term + '”'}</span>
        <span className="meta">{r.rows.length} transaction{r.rows.length === 1 ? '' : 's'}{r.terms.length === 1 && r.terms[0].count ? ' · ' + r.terms[0].how : ''}</span>
        <button className="btn link" onClick={() => setQ('')}>✕ Clear search</button>
      </div>
      {r.terms.length > 1 && (
        <div className="months termchips">
          {r.terms.map(x => (
            <button key={x.term} className="mchip" aria-pressed={x.count > 0} title="Remove this term" onClick={() => setQ(splitTerms(q).filter(t => t !== x.term).join(', '))}>
              {(() => { const d = x.term.replace(/\D/g, ''); const p = d.length >= 6 && parties.find(p => p.phone && p.phone.replace(/\D/g, '').endsWith(d.replace(/^(?:254|0)/, ''))); return p ? titleCase(p.name) + ' · ' + p.phone : titleCase(x.term) })()} <span className="muted">{x.count ? x.count + (x.tier < 3 ? ' · ' + x.how : '') : 'no match'}</span> ✕
            </button>
          ))}
        </div>
      )}
      {ambiguous && (
        <div className="ambig">
          <div className="ambig-head">
            <strong>“{r.terms[0].term}” matches {parties.length} different counterparties.</strong>
            <span> Choose who you meant — each opens only that one’s transactions, nothing is combined.</span>
          </div>
          <ol className="plist compact choose">
            {parties.map((p, i) => (
              <li key={p.key}>
                <button className="prow" onClick={() => setQ(p.phone || p.name)} aria-label={'Show only ' + titleCase(p.name)}>
                  <span className="prank">{i + 1}</span>
                  <span className="pmain">
                    <span className="pname"><span className="ptext">{titleCase(p.name)}</span></span>
                    <span className="pmeta">{p.phone ? <span className="mono">{p.phone}</span> : null}{p.phone ? ' · ' : ''}{p.n} transaction{p.n === 1 ? '' : 's'}{p.sent ? ` · sent ${fmt(p.sent)}` : ''}{p.recv ? ` · received ${fmt(p.recv)}` : ''} · last {p.last}</span>
                  </span>
                  <span className="choose-cta">Show only this one <span aria-hidden="true">→</span></span>
                </button>
              </li>
            ))}
          </ol>
          <div className="ambig-actions">
            <span className="more-note">…or, if you really mean all of them together:</span>
            <button className="btn small ghost" onClick={() => setCombine(true)}>Combine all {parties.length} into one view</button>
          </div>
        </div>
      )}
      {r.suggestions.filter(sg => sg.options.length || true).map(sg => (
        <div className="nomatch" key={sg.term}>
          <span>No match for <strong>“{sg.term}”</strong>{sg.options.length ? ' — did you mean:' : '. Try the full name as it appears on the statement, a phone number, a till / PayBill number, or a receipt.'}</span>
          {sg.options.map(o => (
            <button key={o.value} className="mchip" onClick={() => setQ(splitTerms(q).map(t => (t === sg.term ? o.value : t)).join(', '))}>
              {/^\d/.test(o.value) ? o.value : titleCase(o.value)} <span className="muted">{o.n}</span>
            </button>
          ))}
        </div>
      ))}
      {!ambiguous && r.people.length > 1 && (
        <div className="months">
          <span className="lblx">Matched people</span>
          {r.people.slice(0, 8).map(p => (
            <button key={p.key} className="mchip" onClick={() => setQ(p.phone || p.name)}>
              {titleCase(p.name)}{p.phone ? ' ' + p.phone : ''}
            </button>
          ))}
        </div>
      )}
      {!ambiguous && r.terms.length > 1 && parties.length === 1 && (
        <p className="more-note">All {r.terms.length} terms point to the same counterparty — results are not double-counted.</p>
      )}
      {!ambiguous && r.people.length === 1 && (
        <p className="lede search-lede">
          <strong>{titleCase(r.people[0].name)}</strong>{r.people[0].phone ? ` (${r.people[0].phone})` : ''} — first seen {r.people[0].first}, last {r.people[0].last}.
          {r.people[0].sentN ? ` You sent ${r.people[0].sentN} time${r.people[0].sentN === 1 ? '' : 's'} (KES ${fmt(r.people[0].sent)}, avg ${fmt(r.people[0].sent / r.people[0].sentN)}).` : ''}
          {r.people[0].recvN ? ` They sent you ${r.people[0].recvN} time${r.people[0].recvN === 1 ? '' : 's'} (KES ${fmt(r.people[0].recv)}).` : ''}
          {r.people[0].fulizaN ? ` ${r.people[0].fulizaN} of your transfers were on Fuliza.` : ''}
        </p>
      )}
      {!ambiguous && combine && parties.length > 1 && (
        <p className="lede combined-note"><strong>Combined across {parties.length} counterparties</strong> — {parties.slice(0, 4).map(p => titleCase(p.name)).join(', ')}{parties.length > 4 ? ` and ${parties.length - 4} more` : ''}.</p>
      )}
      {!ambiguous && <div className="tiles">
        {tiles.map(t => (
          <div className="tile" key={t.lbl}>
            <div className="lbl">{t.lbl}</div>
            <div className={'fig ' + t.cls}>{t.v}</div>
            <div className="sub">{t.sub}</div>
          </div>
        ))}
      </div>}
      {!ambiguous && r.cats.out.length > 1 && (
        <section className="panel">
          <h2>Breakdown of matches</h2>
          <HBars entries={r.cats.out} total={catTotal} tipLabel="of matched outflow" showTip={showTip} hideTip={hideTip} />
        </section>
      )}
      {!ambiguous && <section className="panel">
        <h2>Matching transactions{combine && parties.length > 1 ? ` — ${parties.length} counterparties combined` : ''}</h2>
        <TxnTable txns={r.rows} cat={cat} setCat={setCat} title={'Transactions matching “' + q + '”' + (combine && parties.length > 1 ? ' (' + parties.length + ' counterparties combined)' : '')} onPick={onPick} meta={meta} context={context} />
      </section>}
    </div>
  )
}
