// Printable A4 statement-style report for any filtered list of transactions.
import { titleCase } from './insights.js'
import { dayHeading } from './format.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const n0 = n => Math.round(n).toLocaleString('en-KE')
const MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#145E3C"/><circle cx="28" cy="27" r="14.5" fill="none" stroke="#fff" stroke-width="5"/><path d="M39 38l10 10" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="20" y="29" width="4.5" height="7" rx="1.5" fill="#fff"/><rect x="26" y="24" width="4.5" height="12" rx="1.5" fill="#fff"/><rect x="32" y="19" width="4.5" height="17" rx="1.5" fill="#fff"/></svg>'

/**
 * @param rows   transactions, any order (printed newest first, grouped by day)
 * @param opts   { heading, filters: string[], meta: {name, phone, period} }
 */
export function listHtml(rows, opts = {}) {
  const sorted = rows.slice().sort((a, b) => b.dt - a.dt)
  const inn = sorted.reduce((s, t) => s + t.paidIn, 0)
  const out = sorted.reduce((s, t) => s + t.withdrawn, 0)
  const fees = sorted.reduce((s, t) => s + (t.fee || 0), 0)
  const first = sorted[sorted.length - 1]?.date, last = sorted[0]?.date
  const filters = (opts.filters || []).filter(Boolean)
  const meta = opts.meta || {}
  let body = '', day = ''
  for (const t of sorted) {
    if (t.date !== day) {
      day = t.date
      const dh = dayHeading(day)
      const dt = sorted.filter(x => x.date === day)
      body += `<tr class="day"><td colspan="7"><strong>${esc(dh.long)}</strong><span>${dt.length} transaction${dt.length === 1 ? '' : 's'} · in ${n0(dt.reduce((s, x) => s + x.paidIn, 0))} · out ${n0(dt.reduce((s, x) => s + x.withdrawn, 0))}</span></td></tr>`
    }
    const who = t.isCharge && t.parentWho ? 'Fee · ' + titleCase(t.parentWho) : titleCase(t.who)
    const sub = t.phone || (t.code ? t.code + (t.account ? ' · ' + t.account : '') : '')
    body += `<tr class="${t.isCharge ? 'fee' : ''}"><td class="mono">${esc(t.time.slice(0, 5))}</td><td>${esc(t.type)}${t.fuliza && t.cat !== 'Fuliza' ? ' <em>Fuliza</em>' : ''}</td><td><div class="who">${esc(who)}</div>${sub ? `<div class="sub mono">${esc(sub)}</div>` : ''}</td><td class="mono rcpt">${esc(t.receipt)}</td><td class="amt in">${t.paidIn ? n0(t.paidIn) : ''}</td><td class="amt">${t.withdrawn ? n0(t.withdrawn) : ''}</td><td class="amt fee">${t.fee ? n0(t.fee) : ''}</td></tr>`
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(opts.heading || 'Transactions')} — PesaScope</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #EEF2EF; font-family: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, sans-serif; color: #17211B; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 210mm; margin: 20px auto; background: #fff; padding: 16mm 14mm; box-shadow: 0 20px 50px -30px rgba(0,0,0,.35); }
  .head { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 10px; border-bottom: 2px solid #1D7A4E; }
  .head svg { width: 30px; height: 30px; flex: 0 0 auto; }
  .brand { font-weight: 800; font-size: 15px; line-height: 1.1; }
  .brand span { color: #1D7A4E; }
  .brand small { display: block; font-weight: 500; font-size: 10px; color: #56605A; letter-spacing: .04em; }
  .owner { margin-left: auto; text-align: right; font-size: 10.5px; color: #56605A; line-height: 1.4; }
  .owner strong { color: #17211B; display: block; font-size: 11.5px; }
  h1 { font-size: 17px; margin: 14px 0 2px; letter-spacing: -0.01em; }
  .filters { color: #56605A; font-size: 11px; margin: 0 0 10px; }
  .filters b { display: inline-block; background: #E2F0E8; color: #145E3C; border-radius: 999px; padding: 1px 8px; margin-right: 4px; font-weight: 600; }
  .sum { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 10px 0 14px; }
  .sum div { border: 1px solid #DCE3DE; border-radius: 8px; padding: 7px 9px; }
  .sum .k { font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: #7E8880; font-weight: 600; }
  .sum .v { font-size: 14px; font-weight: 800; margin-top: 1px; white-space: nowrap; }
  .sum .v.in { color: #1D7A4E; } .sum .v.neg { color: #B4423C; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 9px; letter-spacing: .07em; text-transform: uppercase; color: #7E8880; padding: 6px 5px; border-bottom: 1px solid #C4CCC6; background: #fff; }
  thead { display: table-header-group; }
  tbody td { padding: 5px; border-bottom: 1px solid #EEF2EF; vertical-align: top; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  tr.day td { background: #F3F6F4; padding: 5px; border-bottom: 1px solid #DCE3DE; }
  tr.day strong { font-size: 10.5px; } tr.day span { color: #7E8880; margin-left: 10px; }
  tr.fee td { color: #7E8880; }
  .who { font-weight: 600; } .sub { color: #7E8880; font-size: 9.5px; }
  .rcpt { color: #56605A; }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 10px; }
  .amt { text-align: right; font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .amt.in { color: #1D7A4E; } .amt.fee { color: #7E8880; }
  em { font-style: normal; font-size: 9px; color: #9A4B11; background: #FFF1E6; border-radius: 999px; padding: 0 5px; }
  tfoot td { padding: 7px 5px; border-top: 2px solid #1D7A4E; font-weight: 700; }
  .foot { margin-top: 14px; padding-top: 8px; border-top: 1px solid #DCE3DE; font-size: 9.5px; color: #7E8880; line-height: 1.5; }
  .actions { text-align: center; margin: 0 0 28px; }
  .actions button { font: inherit; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 999px; border: 1px solid #1D7A4E; background: #1D7A4E; color: #fff; cursor: pointer; margin: 0 5px; }
  .actions button.ghost { background: #fff; color: #1D7A4E; }
  @media print {
    @page { size: A4 portrait; margin: 14mm 12mm; }
    body { background: #fff; }
    .page { max-width: none; margin: 0; padding: 0; box-shadow: none; }
    .actions { display: none; }
  }
</style></head><body>
<div class="page">
  <div class="head">${MARK}<div class="brand">Pesa<span>Scope</span><small>Transaction list</small></div>
    <div class="owner">${meta.name ? `<strong>${esc(titleCase(meta.name))}</strong>` : ''}${meta.phone ? esc(meta.phone) + '<br>' : ''}${meta.period ? 'Statement ' + esc(meta.period) : ''}</div></div>
  <h1>${esc(opts.heading || 'Transactions')}</h1>
  <p class="filters">${filters.map(f => `<b>${esc(f)}</b>`).join('')}${first ? `<span>${esc(first)}${last !== first ? ' → ' + esc(last) : ''}</span>` : ''}</p>
  <div class="sum">
    <div><div class="k">Transactions</div><div class="v">${sorted.length.toLocaleString()}</div></div>
    <div><div class="k">Money in</div><div class="v in">${n0(inn)}</div></div>
    <div><div class="k">Money out</div><div class="v">${n0(out)}</div></div>
    <div><div class="k">Fees</div><div class="v">${n0(fees)}</div></div>
    <div><div class="k">Net</div><div class="v ${inn - out >= 0 ? 'in' : 'neg'}">${inn - out >= 0 ? '+' : '−'}${n0(Math.abs(inn - out))}</div></div>
  </div>
  <table>
    <thead><tr><th>Time</th><th>Type</th><th>Who / what</th><th>Receipt</th><th class="amt">In</th><th class="amt">Out</th><th class="amt">Fee</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="4">${sorted.length.toLocaleString()} transactions</td><td class="amt in">${n0(inn)}</td><td class="amt">${n0(out)}</td><td class="amt fee">${n0(fees)}</td></tr></tfoot>
  </table>
  <div class="foot">Reproduced from your M-PESA statement by PesaScope on this device. A copy for your records — not an official Safaricom document. Amounts in KES.</div>
</div>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button><button class="ghost" onclick="window.close()">Close</button></div>
</body></html>`
}

export function printList(rows, opts) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(listHtml(rows, opts)); w.document.close()
  w.focus()
  setTimeout(() => { try { w.print() } catch {} }, 400)
  return true
}
