import { titleCase } from '../lib/insights.js'
import Section from './Section.jsx'

/** opt-in local memory: what is kept, controls to inspect and forget it */
export default function Settings({ mem, txns = [] }) {
  const { memory, setEnabled, forget, unmerge, clearCategories } = mem
  // names as they appear on the statement, keyed by the *original* identity (pre-alias)
  const names = new Map()
  for (const t of txns) { const k = t.rawKey || (t.phone ? t.key : t.who.toUpperCase()); if (!names.has(k)) names.set(k, t.rawWho || t.who) }
  const nameOf = key => { const n = names.get(key); return n ? titleCase(n) + (/\*/.test(key) ? ' · ' + key : '') : key }
  const fixes = Object.keys(memory.categories).length
  return (
    <Section id="settings" title="Memory on this device" defaultOpen={false}>
      <label className="mem-toggle">
        <input type="checkbox" checked={memory.enabled} onChange={e => setEnabled(e.target.checked)} />
        <span><strong>Remember my fixes on this device</strong><br /><span className="tsub">Only your alias groups (“these are the same person”) and category fixes are kept, in this browser’s local storage. Your statement and transactions are never stored. Off by default.</span></span>
      </label>
      <div className="mem-grid">
        <div>
          <h3>Merged counterparties <span className="tsub">{memory.aliases.length}</span></h3>
          {memory.aliases.length ? (
            <ul className="mem-list">
              {memory.aliases.map(g => (
                <li key={g.canonical}><strong>{g.label || nameOf(g.canonical)}</strong> <span className="tsub">= {g.members.map(nameOf).join(' + ')}</span> <button className="btn link" onClick={() => unmerge(g.canonical)}>Unmerge</button></li>
              ))}
            </ul>
          ) : <p className="more-note">None yet. When a search matches two counterparties that are really one person, choose “merge” in the chooser.</p>}
        </div>
        <div>
          <h3>Category fixes <span className="tsub">{fixes}</span></h3>
          {fixes ? <button className="btn small" onClick={clearCategories}>Reset all fixes</button> : <p className="more-note">None yet. Fix one under “Needs a look”.</p>}
        </div>
      </div>
      <div className="mem-actions">
        <button className="btn small" onClick={forget} disabled={!memory.aliases.length && !fixes && !memory.enabled}>Forget everything</button>
        <span className="more-note">{memory.enabled ? 'Kept in this browser until you forget it.' : 'Not being kept — fixes last only until you close the tab.'}</span>
      </div>
    </Section>
  )
}
