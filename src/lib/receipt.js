// Printable single-transaction receipt in the M-PESA app's receipt layout.
import { titleCase } from './insights.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 4)] || 'th')
export function receiptDate(t) {
  const d = new Date(t.date + 'T' + t.time)
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0')
  return `${ord(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}
const kes = n => 'KES ' + Math.round(n).toLocaleString('en-KE')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const spacedPhone = p => (p || '').replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3')

/** the M-PESA rail, worded the way the app's receipts word it */
export function rail(t) {
  const d = t.details
  if (t.isCharge) return 'Transaction Cost'
  if (/^pay ?bill/i.test(d) || /^intimate card pay/i.test(d)) return 'Pay Bill'
  if (/^merchant payment|^intimate payment merchant/i.test(d)) return 'Buy Goods'
  if (/^customer payment to small/i.test(d)) return 'Pochi la Biashara'
  if (/^customer transfer|^intimate card customer transfer|^offnet c2b transfer/i.test(d)) return 'Send Money'
  if (/^customer withdrawal/i.test(d)) return 'Withdraw Cash'
  if (/^customer deposit|deposit of funds/i.test(d)) return 'Deposit Cash'
  if (/^funds received/i.test(d)) return 'Receive Money'
  if (/^business payment|^salary payment/i.test(d)) return 'Business Payment'
  if (/^receive international/i.test(d)) return 'International Transfer'
  if (/^transfer from bank/i.test(d)) return 'Bank Transfer'
  if (/airtime|bundle/i.test(d)) return 'Airtime & Bundles'
  if (/^overdraft/i.test(d)) return 'Fuliza M-PESA'
  if (/^od loan/i.test(d)) return 'Fuliza Repayment'
  return t.type
}

/** the label/value rows for a transaction, in receipt order */
export function receiptRows(t, meta) {
  const inn = t.paidIn > 0
  const who = titleCase(t.who)
  const rows = [['Date', receiptDate(t)]]
  const partyLabel =
    t.isCharge ? 'Charge For' :
    t.cat === 'Send money' ? 'Sent To' :
    t.cat === 'Cash out' ? 'Withdrawn At' :
    inn ? 'Received From' : 'Paid To'
  rows.push([partyLabel, t.isCharge && t.parentWho ? titleCase(t.parentWho) : who])
  rows.push(['Transaction No', t.receipt])
  rows.push(['Payment Type', rail(t)])
  if (t.code) {
    const d = t.details
    const codeLabel =
      /^merchant payment|^intimate payment merchant/i.test(d) ? 'Till Number' :
      /^customer withdrawal|^customer deposit|deposit of funds/i.test(d) ? 'Agent Number' :
      /^funds received|^business payment|^salary payment|^transfer from bank|^receive international|^sell shares/i.test(d) ? 'Sender Code' :
      /^offnet c2b/i.test(d) ? 'Network Code' :
      t.cat === 'Send money' ? 'Code' : 'Paybill Number'
    rows.push([codeLabel, t.code])
  }
  if (t.phone) rows.push([inn ? 'From Number' : 'Recipient Number', t.phone])
  if (meta?.phone) rows.push(['Phone Number', spacedPhone(meta.phone)])
  if (t.account) rows.push(['Account No', t.account])
  if (t.fee > 0) rows.push(['Transaction Cost', kes(t.fee)])
  if (t.fuliza && t.cat !== 'Fuliza') rows.push(['Funded By', 'Fuliza M-PESA'])
  if (t.balance != null) rows.push(['M-PESA Balance', kes(t.balance)])
  if (!t.isCharge) rows.push(['Category', t.cat])
  return rows
}

export function receiptHtml(t, meta) {
  const inn = t.paidIn > 0
  const first = (meta?.name || '').trim().split(/\s+/)[0]
  const greeting = first ? 'Hi ' + titleCase(first) + ',' : 'Hi,'
  const amountLabel = inn ? 'Total Amount Received' : 'Total Amount Paid'
  const rows = receiptRows(t, meta)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${esc(t.receipt)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #EEF2EF; font-family: "IBM Plex Sans", -apple-system, "Segoe UI", Roboto, sans-serif; color: #17211B; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 420px; max-width: calc(100vw - 24px); margin: 28px auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px -30px rgba(0,0,0,.35); }
  .band { background: #1D7A4E; color: #fff; padding: 18px 24px; display: flex; align-items: center; gap: 12px; }
  .band svg { width: 34px; height: 34px; flex: 0 0 auto; }
  .brand { font-weight: 800; font-size: 19px; letter-spacing: -0.01em; line-height: 1.1; }
  .brand span { color: #A9E3C4; }
  .brand small { display: block; font-weight: 500; font-size: 11.5px; opacity: .9; letter-spacing: .04em; }
  .rcpt { margin-left: auto; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11.5px; opacity: .9; text-align: right; }
  .kanga { height: 5px; background: repeating-linear-gradient(90deg, #000 0 14px, #fff 14px 17px, #B71C1C 17px 31px, #fff 31px 34px, #1E6B47 34px 48px, #fff 48px 51px); }
  .body { padding: 20px 24px 16px; }
  .hi { font-size: 16px; font-weight: 600; margin: 0 0 12px; }
  .amount { margin: 0 0 14px; padding: 14px 16px; border-radius: 12px; background: #E2F0E8; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .amount .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #1D7A4E; font-weight: 600; }
  .amount .v { font-size: 28px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; }
  .amount .v.in { color: #1D7A4E; }
  .rows { display: grid; grid-template-columns: max-content 1fr; column-gap: 14px; row-gap: 0; }
  .row { display: contents; }
  .row .k, .row .v { padding: 7px 0; border-bottom: 1px dashed #DCE3DE; font-size: 13px; }
  .row:last-child .k, .row:last-child .v { border-bottom: none; }
  .row .k { color: #56605A; white-space: nowrap; }
  .row .v { font-weight: 600; word-break: break-word; }
  .row .v.mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12.5px; letter-spacing: .02em; }
  .details { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid #E5E9E5; font-size: 11.5px; color: #7E8880; line-height: 1.45; }
  .foot { padding: 12px 24px 18px; background: #F7F9F7; border-top: 1px solid #E5E9E5; font-size: 10.5px; color: #7E8880; line-height: 1.5; }
  .foot strong { color: #56605A; }
  .actions { text-align: center; margin: 0 0 28px; }
  .actions button { font: inherit; font-weight: 600; padding: 10px 20px; border-radius: 999px; border: 1px solid #1D7A4E; background: #1D7A4E; color: #fff; cursor: pointer; margin: 0 5px; }
  .actions button.ghost { background: #fff; color: #1D7A4E; }
  @media print {
    @page { size: A4; margin: 18mm; }
    body { background: #fff; }
    /* a till-receipt-width card centred on the page — labels and values stay side by side */
    .sheet { width: 110mm; max-width: 110mm; margin: 0 auto; box-shadow: none; border: 1px solid #D8DFDA; border-radius: 10px; }
    .actions { display: none; }
  }
</style></head><body>
<div class="sheet">
  <div class="band">
    <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#145E3C"/><circle cx="28" cy="27" r="14.5" fill="none" stroke="#fff" stroke-width="5"/><path d="M39 38l10 10" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="20" y="29" width="4.5" height="7" rx="1.5" fill="#fff"/><rect x="26" y="24" width="4.5" height="12" rx="1.5" fill="#fff"/><rect x="32" y="19" width="4.5" height="17" rx="1.5" fill="#fff"/></svg>
    <div class="brand">Pesa<span>Scope</span><small>Transaction receipt</small></div>
    <div class="rcpt">${esc(t.receipt)}<br>${esc(t.date)}</div>
  </div>
  <div class="kanga"></div>
  <div class="body">
    <p class="hi">${esc(greeting)}</p>
    <div class="amount"><div class="k">${amountLabel}</div><div class="v ${inn ? 'in' : ''}">${kes(t.paidIn || t.withdrawn)}</div></div>
    <div class="rows">${rows.map(([k, v]) => `<div class="row"><span class="k">${esc(k)}</span><span class="v${/No$|Number|Code|Account/.test(k) ? ' mono' : ''}">${esc(v)}</span></div>`).join('')}</div>
    <p class="details">${esc(t.details)}</p>
  </div>
  <div class="foot"><strong>Reproduced from your M-PESA statement</strong> by PesaScope on this device. This is a copy for your records, not an official Safaricom receipt — the original is in your M-PESA statement under transaction ${esc(t.receipt)}.</div>
</div>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button><button class="ghost" onclick="window.close()">Close</button></div>
</body></html>`
}

/** open the receipt in a new tab and bring up the print dialog */
export function printReceipt(t, meta) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(receiptHtml(t, meta)); w.document.close()
  w.focus()
  setTimeout(() => { try { w.print() } catch {} }, 350)
  return true
}
