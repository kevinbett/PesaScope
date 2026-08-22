import { fmt } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'
import Section from './Section.jsx'

export default function Subscriptions({ items, onPick }) {
  if (!items.length) return null
  return (
    <Section id="regular" title="Regular payments" sub="Payees you pay on a steady rhythm — read from the timing of your payments, not from any subscription list.">
      <ol className="plist">
        {items.map((s, i) => (
          <li key={s.key}>
            <button className="prow" onClick={() => onPick({ name: s.name, key: s.key })} title={'Show every payment to ' + titleCase(s.key)}>
              <span className="prank">{i + 1}</span>
              <span className="pmain">
                <span className="pname"><span className="ptext">{titleCase(s.key)}</span><span className="ptag">{s.cadence}</span>{s.overdue && <span className="ptag due">due</span>}</span>
                <span className="pmeta">{s.n} payments · every ~{s.gapDays} days · last {s.last} · next expected {s.next}{s.code ? ` · ${s.cat === 'Buy Goods (Till)' ? 'Till' : 'PayBill'} ${s.code}` : ''}</span>
              </span>
              <span className="pamt">KES {fmt(s.typical)}<small>typical · {fmt(s.total)} total</small></span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  )
}
