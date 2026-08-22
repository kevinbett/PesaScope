import { fmt } from '../lib/format.js'

export default function Tiles({ txns, people }) {
  const inn = txns.reduce((s, t) => s + t.paidIn, 0)
  const out = txns.reduce((s, t) => s + t.withdrawn, 0)
  const draws = txns.filter(t => t.type === 'Fuliza draw')
  const fuliza = draws.reduce((s, t) => s + t.paidIn, 0)
  const sentP = people.reduce((s, p) => s + p.sent, 0), recvP = people.reduce((s, p) => s + p.recv, 0)
  const net = inn - out
  const tiles = [
    { lbl: 'Money in', sw: 'zilizoingia', v: fmt(inn), cls: 'pos', sub: 'KES' },
    { lbl: 'Money out', sw: 'zilizotoka', v: fmt(out), cls: '', sub: 'KES' },
    { lbl: 'Net', sw: 'salio', v: (net >= 0 ? '+' : '−') + fmt(Math.abs(net)), cls: net >= 0 ? 'pos' : 'negv', sub: 'KES' },
    { lbl: 'Sent to people', sw: 'ulizotuma', v: fmt(sentP), cls: '', sub: `KES · ${people.filter(p => p.sent > 0).length} people` },
    { lbl: 'Received from people', sw: 'ulizopokea', v: fmt(recvP), cls: 'pos', sub: `KES · ${people.filter(p => p.recv > 0).length} people` },
    { lbl: 'Fuliza borrowed', sw: 'deni la Fuliza', v: fmt(fuliza), cls: '', sub: fuliza ? `KES · ${draws.length} draws` : 'none this period' },
  ]
  return (
    <div className="tiles">
      {tiles.map(t => (
        <div className="tile" key={t.lbl}>
          <div className="lbl">{t.lbl}<span className="sw-lbl">{t.sw}</span></div>
          <div className={'fig ' + t.cls}>{t.v}</div>
          {t.sub ? <div className="sub">{t.sub}</div> : null}
        </div>
      ))}
    </div>
  )
}
