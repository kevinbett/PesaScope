// Pure parsing + enrichment for Safaricom "M-PESA Full Statement" PDFs.
// No pdf.js import here so it runs in Node for tests; parser.js wires pdf.js.

// ---------- transaction enrichment ----------
// masked M-Pesa number as printed: 254707***622 / 0743***860 (plus full 2547… in offnet rows)
const PHONE = '((?:254|0)?[17]\\d{2}(?:\\*{3}|\\d{3})\\d{3})'
const rx = s => new RegExp(s, 'i')

const clean = s => (s || '').replace(/\s+/g, ' ').replace(/[\s.\-–]+$/, '').trim()
const TAIL = /\s*(?:via API\.?|by - .*|Original conversation ID.*|- APP to Customer.*|to MPESA Retail\.?)\s*$/i
function stripTail(s) { let prev; do { prev = s; s = s.replace(TAIL, '') } while (s !== prev); return clean(s) }

// ordered: first match wins. Each returns { type, cat, who, phone?, code?, account?, fuliza?, isCharge? }
const RULES = [
  // charges (linked to their parent row by receipt)
  [rx('^(?:customer transfer of funds charge|pay ?bill charge|pay merchant charge|withdrawal charge|.*\\bcharge)$'),
    () => ({ type: 'Charge', cat: 'Charges & fees', who: 'M-PESA charges', isCharge: true })],
  // Fuliza
  [rx('^overdraft of credit party'), () => ({ type: 'Fuliza draw', cat: 'Fuliza', who: 'Fuliza M-PESA', fuliza: true })],
  [rx('^od loan repayment'), () => ({ type: 'Fuliza repayment', cat: 'Fuliza', who: 'Fuliza M-PESA', fuliza: true })],
  // person-to-person sends
  [rx('^customer transfer (fuliza m-?pesa )?to -? ?' + PHONE + ' ?(.*)$'),
    m => ({ type: 'Send money', cat: 'Send money', who: clean(m[3]), phone: m[2], fuliza: !!m[1] })],
  [rx('^intimate card customer transfer to -? ?' + PHONE + ' ?(.*)$'),
    m => ({ type: 'Send money (card)', cat: 'Send money', who: clean(m[2]), phone: m[1] })],
  [rx('^customer payment to small business to -? ?' + PHONE + ' ?(.*)$'),
    m => ({ type: 'Pochi la Biashara', cat: 'Send money', who: clean(m[2]), phone: m[1], pochi: true })],
  [rx('^offnet c2b transfer to (\\d+) - (.+?)\\.? for mobile no\\.? (\\d+)'),
    m => ({ type: 'Send to other network', cat: 'Send money', who: clean(m[2]) + ' · ' + m[3], phone: m[3], code: m[1] })],
  [rx('^offnet c2b transaction reversal'), () => ({ type: 'Reversal', cat: 'Refunds & reversals', who: 'Reversal' })],
  // receipts
  [rx('^funds received from -? ?' + PHONE + ' ?(.*)$'),
    m => ({ type: 'Received', cat: 'Received', who: clean(m[2]), phone: m[1] })],
  [rx('^business payment from (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Business payment', cat: 'From bank', who: stripTail(m[2]).replace(/\.$/, ''), code: m[1] })],
  [rx('^receive international transfer from (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'International transfer', cat: 'Received', who: stripTail(m[2]).replace(/\.$/, ''), code: m[1], intl: true })],
  [rx('^transfer from bank (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Bank to M-Pesa', cat: 'From bank', who: stripTail(m[2]), code: m[1] })],
  [rx('^salary payment from (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Salary', cat: 'Received', who: stripTail(m[2]), code: m[1] })],
  // savings & investments
  [rx('^sell shares payment by (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Shares sold', cat: 'Savings & investments', who: clean(m[2]), code: m[1] })],
  [rx('^ziidi trader customer (?:buying shares|payment) to (\\d+)\\s*-?\\s*(.+?)(?: acc\\.? ?(\\S*))?$'),
    m => ({ type: 'Shares bought', cat: 'Savings & investments', who: clean(m[2]), code: m[1], account: m[3] })],
  [rx('^unit trust invest to (\\d+)\\s*-?\\s*(.+?)(?: by .*)?$'),
    m => ({ type: 'MMF deposit', cat: 'Savings & investments', who: clean(m[2]), code: m[1] })],
  [rx('^unit trust withdraw from (\\d+)\\s*-?\\s*(.+?)(?: by .*)?$'),
    m => ({ type: 'MMF withdrawal', cat: 'Savings & investments', who: clean(m[2]), code: m[1] })],
  [rx('^m-?shwari deposit'), () => ({ type: 'M-Shwari deposit', cat: 'Savings & investments', who: 'M-Shwari' })],
  [rx('^m-?shwari withdraw'), () => ({ type: 'M-Shwari withdrawal', cat: 'Savings & investments', who: 'M-Shwari' })],
  [rx('^m-?shwari lock'), () => ({ type: 'M-Shwari lock savings', cat: 'Savings & investments', who: 'M-Shwari Lock' })],
  // loans
  [rx('^m-?shwari loan disburse'), () => ({ type: 'Loan received', cat: 'Loans', who: 'M-Shwari loan' })],
  [rx('^m-?shwari loan repay'), () => ({ type: 'Loan repayment', cat: 'Loans', who: 'M-Shwari loan' })],
  [rx('^m-?shwari loan request'), () => ({ type: 'Loan request', cat: 'Loans', who: 'M-Shwari loan' })],
  [rx('^kcb m-?pesa withdraw'), () => ({ type: 'Loan received', cat: 'Loans', who: 'KCB M-PESA loan' })],
  [rx('^kcb m-?pesa loan repay'), () => ({ type: 'Loan repayment', cat: 'Loans', who: 'KCB M-PESA loan' })],
  [rx('^kcb m-?pesa loan request'), () => ({ type: 'Loan request', cat: 'Loans', who: 'KCB M-PESA loan' })],
  [rx('^kcb m-?pesa deposit'), () => ({ type: 'KCB M-PESA deposit', cat: 'Savings & investments', who: 'KCB M-PESA' })],
  // bills & merchants
  [rx('^(?:pay ?bill (?:online )?(fuliza m-?pesa )?(?:online )?|intimate card pay ?bill )to (\\d+)\\s*-?\\s*(.+?)(?: acc\\.? ?(.*))?$'),
    m => ({ type: 'PayBill', cat: 'PayBill', who: clean(m[3]), code: m[2], account: clean(m[4]), fuliza: !!m[1] })],
  [rx('^(?:merchant payment (?:online )?(fuliza m-?pesa )?(?:online )?|intimate payment merchant payment )to (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Buy Goods', cat: 'Buy Goods (Till)', who: clean(m[3]), code: m[2], fuliza: !!m[1] })],
  // airtime & bundles
  [rx('^customer bundle purchase (with fuliza )?to (\\d+) ?(.+?) by -'),
    m => ({ type: 'Bundles', cat: 'Airtime & bundles', who: clean(m[3]), code: m[2], fuliza: !!m[1] })],
  [rx('^airtime purchase( with fuliza)?( for other ' + PHONE + ')?'),
    m => ({ type: 'Airtime', cat: 'Airtime & bundles', who: m[3] ? 'Airtime for ' + m[3] : 'Safaricom airtime', fuliza: !!m[1], phone: m[3] })],
  // cash
  [rx('^customer withdrawal at agent till (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Agent withdrawal', cat: 'Cash out', who: clean(m[2]), code: m[1] })],
  [rx('^customer deposit|^deposit of funds at agent till (\\d+)\\s*-?\\s*(.*)$'),
    m => ({ type: 'Agent deposit', cat: 'Cash in', who: clean(m[2] || 'M-Pesa agent'), code: m[1] })],
  [rx('reversal'), () => ({ type: 'Reversal', cat: 'Refunds & reversals', who: 'Reversal' })],
]

// ---------- name-aware refinement: what the payee *is* matters more than the rail ----------
const LOAN_APPS = /\b(timiza|tala\b|zenka|branch international|okash|hustler fund|mogo|kashway|lendplus|ipesa|m-?coop cash|opesa|zash|berry\b)/i
const BETTING = /sportpesa|betika|odibets|betway|1xbet|mozzart|bangbet|sportybet|shabiki|bet ?lion|cheza ?cash|22bet|melbet|betnare|kwikbet|aviator/i
const INVEST = /capital\b|unit trust|\bmmf\b|money market|ziidi|cic asset|britam|sanlam unit|genghis|etica|mali\b|hisa\b|ndovu|shares?\b/i
const INSURANCE = /insurance|assurance|jubilee|nhif|\bsha\b|madison|britam life/i
const BANK = /\bbank\b|equity paybill|\bc2b\b|credit card|prepaid card|\bkcb\b(?! ?m-?pesa)|\babsa\b|\bncba\b|stanbic|co-?operative|\bcoop\b|family bank|\bdtb\b|diamond trust|standard chartered|\bi ?& ?m\b|\bim bank\b|\bgtbank\b|\bsbm\b|\bhfc\b|sidian|prime bank|gulf african|\bboa\b|\buba\b|\bimt\b|mtos/i
const NOT_BANK = /lipa na kcb|kcb m-?pesa/i

function refine(r) {
  const who = r.who || ''
  if (r.cat === 'PayBill' || r.cat === 'Buy Goods (Till)' || r.cat === 'From bank' || r.cat === 'Received') {
    if (BETTING.test(who)) { r.cat = 'Betting'; r.type = r.cat === 'From bank' || r.type === 'Business payment' ? 'Betting payout' : 'Betting stake' }
    else if (LOAN_APPS.test(who)) { r.cat = 'Loans'; r.type = r.type === 'Business payment' ? 'Loan received (app)' : 'Loan repayment (app)' }
    else if (INVEST.test(who) && !/insurance/i.test(who)) { r.cat = 'Savings & investments'; r.type = r.type === 'Business payment' ? 'Investment payout' : 'Investment deposit' }
    else if (INSURANCE.test(who)) { r.cat = 'Insurance'; r.type = 'Insurance premium' }
    else if (r.type === 'International transfer') { /* remittances stay under Received */ }
    else if (BANK.test(who) && !NOT_BANK.test(who)) { r.cat = 'Bank & cards'; r.type = r.type === 'PayBill' ? 'To bank / card' : r.type }
    else if (r.cat === 'From bank') { r.cat = 'Bank & cards' }
  }
  return r
}

/** merchant/brand key: case-insensitive, without trailing register/branch numbers */
export function brandKey(who) {
  return (who || '').toUpperCase().replace(/[\s\-–:]+\d+[A-Z]?$/, '').replace(/\s+/g, ' ').trim()
}

export function enrich(details) {
  const d = clean(details)
  for (const [re, fn] of RULES) {
    const m = d.match(re)
    if (m) {
      const r = refine(fn(m))
      if (!r.who) r.who = d.slice(0, 30)
      r.key = r.phone ? r.phone.replace(/^(?:254|0)/, '') : brandKey(r.who)
      return r
    }
  }
  return { type: 'Other', cat: 'Other', who: d.slice(0, 30) || 'Unlabelled', key: brandKey(d.slice(0, 30) || 'UNLABELLED') }
}
export const categorize = details => enrich(details).cat
export const counterparty = details => enrich(details).who

// ---------- text extraction (pdf.js document → positioned lines) ----------
export async function extractLines(doc) {
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

// ---------- statement parsing ----------
const AMT_RE = /^-?\(?[\d,]+\.\d{2}\)?$/
const RCPT_RE = /^[A-Z][A-Z0-9]{7,11}$/
const DATE_RE = /(\d{4}-\d{2}-\d{2})[ T]?(\d{2}:\d{2}(?::\d{2})?)?/
const JUNK = /transaction type|paid in|summary|detailed statement|disclaimer|page \d+ of|statement verification|prompts to enter|conditions apply|self-help|data protection|for which it was provided|^\s*$/i
const SUMMARY_RE = /^(SEND MONEY|RECEIVED MONEY|AGENT DEPOSIT|AGENT WITHDRAWAL|LIPA NA M-PESA \(PAYBILL\)|LIPA NA M-PESA \(BUY GOODS\)|OTHERS|TOTAL):?\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/i

function parseAmount(s) {
  const neg = /^-|\(/.test(s)
  const v = parseFloat(s.replace(/[(),-]/g, '').replace(/,/g, ''))
  return neg ? -v : v
}

export function parseStatement(lines) {
  const meta = { name: '', phone: '', period: '' }
  const summary = {}
  for (const l of lines.slice(0, 40)) {
    let m
    if ((m = l.text.match(/customer name\s*:?\s*(.+)/i))) meta.name = m[1].trim()
    else if ((m = l.text.match(/mobile number\s*:?\s*([\d*+ ]+)/i))) meta.phone = m[1].replace(/\s+/g, '').trim()
    else if ((m = l.text.match(/statement period\s*:?\s*(.+)/i))) meta.period = m[1].trim()
    else if ((m = l.text.match(SUMMARY_RE))) summary[m[1].toUpperCase()] = { paidIn: parseAmount(m[2]), paidOut: parseAmount(m[3]) }
  }

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
      // headers are centred but data is left-aligned: learn the real start of
      // the details column from the data rows themselves
      const firstDetail = l.items.slice(1).find(it => !DATE_RE.test(it.str) && !AMT_RE.test(it.str) && !/^(completed|failed|pending|cancelled)$/i.test(it.str))
      if (firstDetail && cols) cols.detailsData = cols.detailsData === undefined ? firstDetail.x : Math.min(cols.detailsData, firstDetail.x)
    } else if (cur && !JUNK.test(l.text)) {
      for (const it of l.items) {
        if (cols && cols.details !== undefined) {
          const lim = cols.status !== undefined ? cols.status : (cols.paidIn ? cols.paidIn - 60 : 1e9)
          const start = (cols.detailsData !== undefined ? Math.min(cols.detailsData, cols.details) : cols.details) - 15
          if (it.x >= start && it.x < lim) cur.details.push(it.str)
        } else if (!AMT_RE.test(it.str) && !RCPT_RE.test(it.str) && !DATE_RE.test(it.str)) {
          cur.details.push(it.str)
        }
      }
    }
  }

  for (const t of txns) {
    t.amts.sort((a, b) => a.right - b.right)
    if (t.amts.length >= 2) {
      t.balance = t.amts[t.amts.length - 1].v
      t.value = Math.abs(t.amts[0].v); t.valueNeg = t.amts[0].v < 0; t.valueRight = t.amts[0].right
    } else if (t.amts.length === 1) {
      const a = t.amts[0]
      if (cols && cols.balance !== undefined && Math.abs(a.right - cols.balance) < 25) { t.balance = a.v; t.value = 0 }
      else { t.value = Math.abs(a.v); t.valueNeg = a.v < 0; t.valueRight = a.right; t.balance = null }
    } else { t.value = 0; t.balance = null }
    t.key = t.date + 'T' + (t.time.length === 5 ? t.time + ':00' : t.time)
  }

  const dated = txns.filter(t => t.key)
  const ascending = dated.length < 2 || dated[0].key <= dated[dated.length - 1].key
  const havePW = cols && cols.paidIn !== undefined && cols.withdrawn !== undefined
  const semanticIn = /received|transfer from|payment from|deposit|overdraft of credit|salary|promotion|reversal|withdraw from|sell shares|loan disburse|m-shwari withdraw|kcb m-pesa withdraw/i

  txns.forEach((t, i) => {
    let dir = null
    const prev = ascending ? txns[i - 1] : txns[i + 1]
    if (t.balance != null && prev && prev.balance != null && t.value > 0) {
      const delta = t.balance - prev.balance
      if (Math.abs(delta - t.value) < 0.011) dir = 'in'
      else if (Math.abs(delta + t.value) < 0.011) dir = 'out'
    }
    if (!dir && havePW && t.valueRight !== undefined)
      dir = Math.abs(t.valueRight - cols.paidIn) <= Math.abs(t.valueRight - cols.withdrawn) ? 'in' : 'out'
    if (!dir && t.valueNeg) dir = 'out'
    if (!dir) dir = semanticIn.test(t.details.join(' ')) ? 'in' : 'out'
    t.paidIn = dir === 'in' ? t.value : 0
    t.withdrawn = dir === 'out' ? t.value : 0
  })

  const out = txns
    .filter(t => !t.status || /completed/i.test(t.status))
    .map(t => {
      const details = t.details.join(' ').replace(/\s+/g, ' ').trim()
      const e = enrich(details)
      return {
        receipt: t.receipt, dt: new Date(t.key), date: t.date, time: t.time, details,
        cat: e.cat, type: e.type, who: e.who, key: e.key,
        phone: e.phone || '', code: e.code || '', account: e.account || '',
        fuliza: !!e.fuliza, isCharge: !!e.isCharge, pochi: !!e.pochi,
        paidIn: t.paidIn, withdrawn: t.withdrawn, balance: t.balance,
      }
    })
    .filter(t => t.paidIn > 0 || t.withdrawn > 0)
  out.sort((a, b) => a.dt - b.dt)
  linkCharges(out)
  return { meta, summary, txns: out }
}

/** attach each charge row's amount to the non-charge row sharing its receipt */
export function linkCharges(txns) {
  const byReceipt = new Map()
  for (const t of txns) if (!t.isCharge) {
    const list = byReceipt.get(t.receipt) || []
    list.push(t); byReceipt.set(t.receipt, list)
  }
  for (const t of txns) t.fee = 0
  for (const c of txns) if (c.isCharge) {
    const parents = (byReceipt.get(c.receipt) || []).filter(p => p.withdrawn > 0 && !p.fuliza)
    const target = parents[0] || (byReceipt.get(c.receipt) || [])[0]
    if (target) { target.fee += c.withdrawn; c.parentWho = target.who; c.parentKey = target.key }
  }
}
