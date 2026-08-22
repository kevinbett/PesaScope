import { fmt } from '../lib/format.js'
import { titleCase, splitTerms } from '../lib/insights.js'
import HBars from './HBars.jsx'
import TxnTable from './TxnTable.jsx'

export default function SearchResults({ q, result, cat, setCat, setQ, showTip, hideTip, onPick, meta, context }) {
  const r = result
  const tiles = [
    { lbl: 'You sent', v: fmt(r.sent), sub: `KES · ${r.sentN} transfer${r.sentN === 1 ? '' : 's'} to people`, cls: '' },
    { lbl: 'You received', v: fmt(r.recv), sub: `KES · ${r.recvN} receipt${r.recvN === 1 ? '' : 's'} from people`, cls: 'pos' },
    { lbl: 'All money out', v: fmt(r.out), sub: `KES · ${r.rows.filter(t => t.withdrawn > 0).length} rows incl. bills & fees`, cls: '' },
    { lbl: 'All money in', v: fmt(r.inn), sub: `KES · ${r.rows.filter(t => t.paidIn > 0).length} rows`, cls: 'pos' },
    { lbl: 'Fees on these', v: fmt(r.fees), sub: 'KES · charges linked to matches', cls: r.fees ? 'negv' : '' },
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
        <div className="months">
          {r.terms.map(x => (
            <button key={x.term} className="mchip" aria-pressed={x.count > 0} title="Remove this term" onClick={() => setQ(splitTerms(q).filter(t => t !== x.term).join(', '))}>
              {titleCase(x.term)} <span className="muted">{x.count ? x.count + (x.tier < 3 ? ' · ' + x.how : '') : 'no match'}</span> ✕
            </button>
          ))}
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
      {r.people.length > 1 && (
        <div className="months">
          <span className="lblx">Matched people</span>
          {r.people.slice(0, 8).map(p => (
            <button key={p.key} className="mchip" onClick={() => setQ(p.phone || p.name)}>
              {titleCase(p.name)}{p.phone ? ' ' + p.phone : ''}
            </button>
          ))}
        </div>
      )}
      {r.people.length === 1 && (
        <p className="lede">
          <strong>{titleCase(r.people[0].name)}</strong>{r.people[0].phone ? ` (${r.people[0].phone})` : ''} — first seen {r.people[0].first}, last {r.people[0].last}.
          {r.people[0].sentN ? ` You sent ${r.people[0].sentN} time${r.people[0].sentN === 1 ? '' : 's'} (KES ${fmt(r.people[0].sent)}, avg ${fmt(r.people[0].sent / r.people[0].sentN)}).` : ''}
          {r.people[0].recvN ? ` They sent you ${r.people[0].recvN} time${r.people[0].recvN === 1 ? '' : 's'} (KES ${fmt(r.people[0].recv)}).` : ''}
          {r.people[0].fulizaN ? ` ${r.people[0].fulizaN} of your transfers were on Fuliza.` : ''}
        </p>
      )}
      <div className="tiles">
        {tiles.map(t => (
          <div className="tile" key={t.lbl}>
            <div className="lbl">{t.lbl}</div>
            <div className={'fig ' + t.cls}>{t.v}</div>
            <div className="sub">{t.sub}</div>
          </div>
        ))}
      </div>
      {r.cats.out.length > 1 && (
        <section className="panel">
          <h2>Breakdown of matches</h2>
          <HBars entries={r.cats.out} total={catTotal} tipLabel="of matched outflow" showTip={showTip} hideTip={hideTip} />
        </section>
      )}
      <section className="panel">
        <h2>Matching transactions</h2>
        <TxnTable txns={r.rows} cat={cat} setCat={setCat} title={'Transactions matching “' + q + '”'} onPick={onPick} meta={meta} context={context} />
      </section>
    </div>
  )
}
