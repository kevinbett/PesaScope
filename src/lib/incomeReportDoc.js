// Printable A4 "Income & Affordability Report" generated in-browser from an
// incomeReport() model. Same brand + CSP-safe popup pattern as receipt.js
// (handlers attached from the opener, never inline onclick).
import { titleCase } from './insights.js'

const kes = n => 'KES ' + Math.round(n || 0).toLocaleString('en-KE')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const pct = f => Math.round((f || 0) * 100) + '%'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const prettyDate = iso => iso ? +iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4) : '—'

function bars(monthly) {
  const max = Math.max(1, ...monthly.map(m => m.income))
  return monthly.map(m => `<div class="mrow">
      <span class="ml">${esc(m.label)}</span>
      <span class="mbar"><i style="width:${Math.max(2, Math.round(m.income / max * 100))}%"></i></span>
      <span class="mv">${esc(kes(m.income))}</span>
    </div>`).join('')
}

function sourceRows(sources) {
  if (!sources.length) return '<p class="muted">No named income sources found.</p>'
  return sources.map(s => `<div class="srow">
      <span class="sn">${esc(titleCase(s.name))}${s.recurring ? ` <b class="tag">${esc(s.cadence || 'regular')}</b>` : ''}</span>
      <span class="sv">${esc(kes(s.total))}<small>${esc(pct(s.share))}</small></span>
    </div>`).join('')
}

const exclRow = (label, v) => v > 0 ? `<div class="xrow"><span>${esc(label)}</span><span>${esc(kes(v))}</span></div>` : ''

export function incomeReportHtml(r) {
  const name = r.name ? titleCase(r.name) : 'Statement holder'
  const generated = prettyDate(new Date().toISOString().slice(0, 10))
  const x = r.excluded
  const excludedHtml = [
    exclRow('Loans received', x.loans),
    exclRow('Fuliza (overdraft)', x.fuliza),
    exclRow('Cash deposits', x.cashIn),
    exclRow('Savings withdrawn back', x.savings),
    exclRow('Reversals / refunds', x.reversals),
    exclRow('One-off bank transfers in', x.bankIn),
  ].join('') || '<div class="xrow muted"><span>Nothing excluded</span><span>—</span></div>'

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Income Report — ${esc(name)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #EEF2EF; font-family: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, sans-serif; color: #17211B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 210mm; max-width: calc(100vw - 24px); margin: 24px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px -30px rgba(0,0,0,.35); }
  .band { background: #1D7A4E; color: #fff; padding: 20px 28px; display: flex; align-items: center; gap: 14px; }
  .band svg { width: 36px; height: 36px; flex: 0 0 auto; }
  .brand { font-weight: 800; font-size: 20px; letter-spacing: -0.01em; line-height: 1.1; }
  .brand span { color: #A9E3C4; }
  .brand small { display: block; font-weight: 500; font-size: 12px; opacity: .9; letter-spacing: .04em; }
  .meta { margin-left: auto; text-align: right; font-size: 12px; opacity: .95; line-height: 1.5; }
  .kanga { height: 5px; background: repeating-linear-gradient(90deg, #000 0 14px, #fff 14px 17px, #B71C1C 17px 31px, #fff 31px 34px, #1E6B47 34px 48px, #fff 48px 51px); }
  .body { padding: 22px 28px 8px; }
  .who { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 0 0 16px; flex-wrap: wrap; }
  .who h1 { font-size: 19px; margin: 0; letter-spacing: -0.01em; }
  .who .p { font-size: 12.5px; color: #56605A; font-family: "IBM Plex Mono", ui-monospace, monospace; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 18px; }
  .card { background: #E2F0E8; border-radius: 12px; padding: 12px 14px; }
  .card .k { font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: #1D7A4E; font-weight: 600; }
  .card .v { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; margin-top: 3px; }
  .card .s { font-size: 11px; color: #56605A; margin-top: 2px; }
  h2 { font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: #56605A; margin: 20px 0 10px; }
  .mrow, .srow { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #DCE3DE; font-size: 13px; }
  .ml { width: 92px; color: #56605A; flex: 0 0 auto; }
  .mbar { flex: 1; height: 10px; background: #EDF2EF; border-radius: 6px; overflow: hidden; }
  .mbar i { display: block; height: 100%; background: #1D7A4E; border-radius: 6px; }
  .mv { width: 118px; text-align: right; font-weight: 600; flex: 0 0 auto; }
  .sn { flex: 1; font-weight: 600; }
  .sn .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #1D7A4E; background: #D6EBDF; padding: 1px 7px; border-radius: 999px; margin-left: 6px; }
  .sv { text-align: right; font-weight: 700; }
  .sv small { display: block; font-weight: 500; color: #7E8880; font-size: 11px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .note { background: #F7F9F7; border: 1px solid #E5E9E5; border-radius: 12px; padding: 14px 16px; }
  .xrow { display: flex; justify-content: space-between; font-size: 12.5px; padding: 5px 0; border-bottom: 1px dashed #E5E9E5; }
  .xrow:last-child { border-bottom: none; }
  .muted { color: #7E8880; }
  .afford { font-size: 13px; line-height: 1.55; }
  .afford b { font-size: 20px; }
  .foot { padding: 14px 28px 20px; background: #F7F9F7; border-top: 1px solid #E5E9E5; font-size: 10.5px; color: #7E8880; line-height: 1.55; }
  .foot strong { color: #56605A; }
  .actions { text-align: center; margin: 6px 0 28px; }
  .actions button { font: inherit; font-weight: 600; padding: 10px 20px; border-radius: 999px; border: 1px solid #1D7A4E; background: #1D7A4E; color: #fff; cursor: pointer; margin: 0 5px; }
  .actions button.ghost { background: #fff; color: #1D7A4E; }
  @media print { @page { size: A4; margin: 14mm; } body { background: #fff; } .sheet { width: auto; max-width: none; margin: 0; box-shadow: none; border-radius: 0; } .actions { display: none; } }
</style></head><body>
<div class="sheet">
  <div class="band">
    <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#145E3C"/><circle cx="28" cy="27" r="14.5" fill="none" stroke="#fff" stroke-width="5"/><path d="M39 38l10 10" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="20" y="29" width="4.5" height="7" rx="1.5" fill="#fff"/><rect x="26" y="24" width="4.5" height="12" rx="1.5" fill="#fff"/><rect x="32" y="19" width="4.5" height="17" rx="1.5" fill="#fff"/></svg>
    <div class="brand">Pesa<span>Scope</span><small>Income &amp; Affordability Report</small></div>
    <div class="meta">Period: ${esc(prettyDate(r.period.from))} – ${esc(prettyDate(r.period.to))}<br>Generated ${esc(generated)}</div>
  </div>
  <div class="kanga"></div>
  <div class="body">
    <div class="who"><h1>${esc(name)}</h1><span class="p">${esc(r.phone || '')}</span></div>
    <div class="cards">
      <div class="card"><div class="k">Avg monthly income</div><div class="v">${esc(kes(r.avgMonthly))}</div><div class="s">over ${r.period.months} month${r.period.months === 1 ? '' : 's'}</div></div>
      <div class="card"><div class="k">Total income</div><div class="v">${esc(kes(r.totalCounted))}</div><div class="s">${r.counts.incomeTxns} receipts</div></div>
      <div class="card"><div class="k">Active months</div><div class="v">${r.activeMonths}</div><div class="s">had income</div></div>
      <div class="card"><div class="k">Stability</div><div class="v">${esc(r.stability.label)}</div><div class="s">month to month</div></div>
    </div>

    <h2>Monthly income</h2>
    ${bars(r.monthly)}

    <div class="two">
      <div>
        <h2>Income sources</h2>
        ${sourceRows(r.sources)}
      </div>
      <div>
        <h2>Affordability estimate</h2>
        <div class="note afford">Based on average monthly income, a sustainable monthly commitment (rent or loan repayment) is around<br><b>${esc(kes(r.affordability.rent))}</b><br><span class="muted">Guide only (≈⅓ of income), not financial advice.</span></div>
      </div>
    </div>

    <h2>How this was calculated</h2>
    <div class="note">
      <p style="margin:0 0 8px;font-size:12.5px;line-height:1.5">Income counts money genuinely received — regular income (salary / a recurring payer) and variable receipts from customers. Money that only passed through your account is <b>excluded</b>, so the figure isn't inflated:</p>
      ${excludedHtml}
    </div>
  </div>
  <div class="foot"><strong>Prepared by PesaScope on this device from the account holder's own M-PESA statement.</strong> Figures are computed locally and self-reported — this is not an official Safaricom document, a credit score, or financial advice. Amounts reconcile to the statement's own totals.</div>
</div>
<div class="actions"><button id="print">Print / Save as PDF</button><button class="ghost" id="close">Close</button></div>
</body></html>`
}

/** open the report in a new tab and bring up the print dialog (CSP-safe: no inline handlers) */
export function printIncomeReport(r) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(incomeReportHtml(r)); w.document.close()
  w.document.getElementById('print')?.addEventListener('click', () => w.print())
  w.document.getElementById('close')?.addEventListener('click', () => w.close())
  w.focus()
  setTimeout(() => { try { w.print() } catch {} }, 350)
  return true
}
