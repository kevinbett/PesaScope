// M-PESA "Full Statement" PDF parser — runs entirely in the browser via pdf.js.
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ---------- categorisation ----------
const CATS = [
  { name: 'Charges & fees',    re: /charge|fee\b|commission/i },
  { name: 'Airtime & bundles', re: /airtime|bundle/i },
  { name: 'Fuliza',            re: /od loan|overdraft|over ?draw|fuliza/i },
  { name: 'Savings & loans',   re: /m-?shwari|kcb ?m-?pesa|lock savings|loan (dis|re)/i },
  { name: 'PayBill',           re: /pay ?bill/i },
  { name: 'Buy Goods (Till)',  re: /merchant payment|buy ?goods|pochi/i },
  { name: 'Cash out',          re: /withdraw/i },
  { name: 'Cash in',           re: /deposit/i },
  { name: 'Send money',        re: /customer transfer to|customer send/i },
  { name: 'Received',          re: /received|transfer from|business payment|salary|promotion payment/i },
]

export function categorize(details) {
  for (const c of CATS) if (c.re.test(details)) return c.name
  return 'Other'
}

export function counterparty(details) {
  const m = details.match(/(?:to|from|at agent till)\s+(?:-\s*)?(?:\d{4,8}\s*-\s*)?(.+)$/i)
  let name = m ? m[1] : details
  name = name.replace(/acc\.?\s.*$/i, '').replace(/via.*$/i, '')
             .replace(/^[\s\-–]*/, '').replace(/^[\d*+]+\s*/, '').trim()
  if (!name) name = details.slice(0, 28)
  if (name.length > 30) name = name.slice(0, 29) + '…'
  return name
}

// ---------- PDF text extraction ----------
async function extractLines(doc) {
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    const rows = []
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue
      const x = it.transform[4], y = it.transform[5]
      let row = rows.find(r => Math.abs(r.y - y) < 3)
      if (!row) { row = { y, items: [] }; rows.push(row) }
      row.items.push({ x, w: it.width || 0, str: it.str.trim() })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x)
      r.text = r.items.map(i => i.str).join(' ')
      r.page = p
      lines.push(r)
    }
  }
  return lines
}

const AMT_RE = /^-?\(?[\d,]+\.\d{2}\)?$/
const RCPT_RE = /^[A-Z][A-Z0-9]{7,11}$/
const DATE_RE = /(\d{4}-\d{2}-\d{2})[ T]?(\d{2}:\d{2}(?::\d{2})?)?/

function parseAmount(s) {
  const neg = /^-|\(/.test(s)
  const v = parseFloat(s.replace(/[(),-]/g, '').replace(/,/g, ''))
  return neg ? -v : v
}

function parseStatement(lines) {
  const meta = { name: '', phone: '', period: '' }
  for (const l of lines.slice(0, 30)) {
    let m
    if ((m = l.text.match(/customer name\s*:?\s*(.+)/i))) meta.name = m[1].trim()
    else if ((m = l.text.match(/mobile number\s*:?\s*([\d*+]+)/i))) meta.phone = m[1].trim()
    else if ((m = l.text.match(/(?:statement )?period\s*:?\s*(.+)/i))) meta.period = m[1].trim()
  }

  // find the detail-table header to learn column x positions (best effort:
  // pdf.js sometimes merges adjacent header cells into a single item)
  let cols = null
  for (const l of lines) {
    if (/receipt/i.test(l.text) && /details/i.test(l.text) && /balance/i.test(l.text)) {
      cols = {}
      for (const it of l.items) {
        const s = it.str.toLowerCase()
        if (s.startsWith('receipt')) cols.receipt = it.x
        else if (s.startsWith('completion')) cols.time = it.x
        else if (s.startsWith('details')) cols.details = it.x
        else if (s.includes('status')) cols.status = it.x
        else if (s.startsWith('paid')) cols.paidIn = it.x + it.w
        else if (s.startsWith('withdraw')) cols.withdrawn = it.x + it.w
        else if (s.startsWith('balance')) cols.balance = it.x + it.w
        else if (s.includes('transaction') && cols.status === undefined) cols.status = it.x
      }
      break
    }
  }

  const txns = []
  let cur = null
  const junk = /transaction type|paid in|summary|detailed statement|disclaimer|page \d+ of|statement verification|^\s*$/i

  function classifyToken(it, t, dm) {
    const s = it.str
    if (DATE_RE.test(s) && (s.includes(dm[1]) || /^\d{2}:\d{2}/.test(s))) return
    if (/^(completed|failed|pending|cancelled)$/i.test(s)) { t.status = s; return }
    if (AMT_RE.test(s)) { t.amts.push({ v: parseAmount(s), right: it.x + it.w }); return }
    t.details.push(s)
  }

  for (const l of lines) {
    const first = l.items[0]
    const dm = l.text.match(DATE_RE)
    const isNew = first && RCPT_RE.test(first.str) && dm && l.items.length >= 3
    if (isNew) {
      cur = { receipt: first.str, date: dm[1], time: dm[2] || '00:00:00', details: [], status: '', amts: [] }
      txns.push(cur)
      for (const it of l.items.slice(1)) classifyToken(it, cur, dm)
    } else if (cur && !junk.test(l.text)) {
      // continuation of details — only accept items in the details column zone
      for (const it of l.items) {
        if (cols && cols.details !== undefined) {
          const lim = cols.status !== undefined ? cols.status : (cols.paidIn ? cols.paidIn - 60 : 1e9)
          if (it.x >= cols.details - 15 && it.x < lim) cur.details.push(it.str)
        } else if (!AMT_RE.test(it.str) && !RCPT_RE.test(it.str) && !DATE_RE.test(it.str)) {
          cur.details.push(it.str)
        }
      }
    }
  }

  // --- resolve each row's value vs running balance (layout-independent) ---
  for (const t of txns) {
    t.amts.sort((a, b) => a.right - b.right)
    if (t.amts.length >= 2) {
      t.balance = t.amts[t.amts.length - 1].v
      t.value = Math.abs(t.amts[0].v)
      t.valueNeg = t.amts[0].v < 0
      t.valueRight = t.amts[0].right
    } else if (t.amts.length === 1) {
      const a = t.amts[0]
      if (cols && cols.balance !== undefined && Math.abs(a.right - cols.balance) < 25) {
        t.balance = a.v; t.value = 0
      } else {
        t.value = Math.abs(a.v); t.valueNeg = a.v < 0; t.valueRight = a.right; t.balance = null
      }
    } else { t.value = 0; t.balance = null }
    t.key = t.date + 'T' + (t.time.length === 5 ? t.time + ':00' : t.time)
  }

  // statement row order: ascending or descending in time?
  const dated = txns.filter(t => t.key)
  const ascending = dated.length < 2 || dated[0].key <= dated[dated.length - 1].key

  const havePW = cols && cols.paidIn !== undefined && cols.withdrawn !== undefined
  const semanticIn = /received|transfer from|payment from|deposit|overdraft of credit|salary|promotion|reversal/i

  txns.forEach((t, i) => {
    let dir = null
    // 1) balance delta against the chronologically previous row
    const prev = ascending ? txns[i - 1] : txns[i + 1]
    if (t.balance != null && prev && prev.balance != null && t.value > 0) {
      const delta = t.balance - prev.balance
      if (Math.abs(delta - t.value) < 0.011) dir = 'in'
      else if (Math.abs(delta + t.value) < 0.011) dir = 'out'
    }
    // 2) column position, when the header parsed into separate items
    if (!dir && havePW && t.valueRight !== undefined) {
      dir = Math.abs(t.valueRight - cols.paidIn) <= Math.abs(t.valueRight - cols.withdrawn) ? 'in' : 'out'
    }
    // 3) negative amount means money out; else infer from wording
    if (!dir && t.valueNeg) dir = 'out'
    if (!dir) dir = semanticIn.test(t.details.join(' ')) ? 'in' : 'out'
    t.paidIn = dir === 'in' ? t.value : 0
    t.withdrawn = dir === 'out' ? t.value : 0
  })

  const out = txns
    .filter(t => !t.status || /completed/i.test(t.status))
    .map(t => {
      const details = t.details.join(' ').replace(/\s+/g, ' ').trim()
      return {
        receipt: t.receipt,
        dt: new Date(t.key),
        date: t.date,
        details,
        cat: categorize(details),
        who: counterparty(details),
        paidIn: t.paidIn,
        withdrawn: t.withdrawn,
        balance: t.balance,
      }
    })
    .filter(t => t.paidIn > 0 || t.withdrawn > 0)
  out.sort((a, b) => a.dt - b.dt)
  return { meta, txns: out }
}

/** name of the error pdf.js throws for missing/wrong passwords */
export function isPasswordError(e) {
  return e && (e.name === 'PasswordException' || /password/i.test(String(e.message)))
}

/**
 * Parse an M-Pesa statement PDF.
 * @param {ArrayBuffer} buf  the PDF bytes
 * @param {string} [password]
 * @returns {Promise<{meta: object, txns: object[]}>}
 */
export async function parsePdf(buf, password) {
  const doc = await pdfjsLib.getDocument({ data: buf.slice(0), password: password || undefined }).promise
  const lines = await extractLines(doc)
  return parseStatement(lines)
}
