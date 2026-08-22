// Derived views over parsed transactions: people, merchants, habits, search.
import { brandKey } from './parser-core.js'

const P2P_SEND = t => t.cat === 'Send money' && t.withdrawn > 0
const P2P_RECV = t => t.cat === 'Received' && t.paidIn > 0
const SPEND = t => t.withdrawn > 0 && !t.isCharge && !['Fuliza', 'Savings & investments', 'Bank & cards', 'Loans'].includes(t.cat)

const sum = (arr, f) => arr.reduce((s, t) => s + f(t), 0)
export const titleCase = s => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\bM-pesa\b/g, 'M-PESA')

/** people you transact with: sends + receipts merged by phone/name */
export function buildPeople(txns) {
  const map = new Map()
  for (const t of txns) {
    const isSend = P2P_SEND(t), isRecv = P2P_RECV(t)
    if (!isSend && !isRecv) continue
    let p = map.get(t.key)
    if (!p) { p = { key: t.key, name: t.who, phone: t.phone, sentN: 0, sent: 0, recvN: 0, recv: 0, fees: 0, fulizaN: 0, first: t.date, last: t.date, txns: [], intl: false }; map.set(t.key, p) }
    if (isSend) { p.sentN++; p.sent += t.withdrawn; p.fees += t.fee || 0; if (t.fuliza) p.fulizaN++ }
    if (isRecv) { p.recvN++; p.recv += t.paidIn; if (t.type === 'International transfer') p.intl = true }
    if (t.date < p.first) p.first = t.date
    if (t.date > p.last) p.last = t.date
    p.txns.push(t)
  }
  const people = [...map.values()]
  for (const p of people) { p.total = p.sent + p.recv; p.net = p.recv - p.sent; p.n = p.sentN + p.recvN }
  return people
}
export const topSentTo = (people, n = 10) => people.filter(p => p.sent > 0).sort((a, b) => b.sent - a.sent).slice(0, n)
export const topReceivedFrom = (people, n = 10) => people.filter(p => p.recv > 0).sort((a, b) => b.recv - a.recv).slice(0, n)

/** merchants & bills grouped by brand (till/paybill rails, plus insurance & betting) */
export function topMerchants(txns, n = 12) {
  const map = new Map()
  for (const t of txns) {
    if (!(t.withdrawn > 0) || !['Buy Goods (Till)', 'PayBill', 'Insurance', 'Betting', 'Airtime & bundles'].includes(t.cat)) continue
    const k = brandKey(t.who)
    let m = map.get(k)
    if (!m) { m = { key: k, name: t.who, cat: t.cat, code: t.code, n: 0, total: 0, fees: 0, last: t.date, fulizaN: 0 }; map.set(k, m) }
    m.n++; m.total += t.withdrawn; m.fees += t.fee || 0; if (t.fuliza) m.fulizaN++
    if (t.date > m.last) { m.last = t.date; m.name = t.who }
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, n)
}

export function categoryTotals(txns) {
  const out = {}, inn = {}
  for (const t of txns) {
    if (t.withdrawn > 0) out[t.cat] = (out[t.cat] || 0) + t.withdrawn
    if (t.paidIn > 0) inn[t.cat] = (inn[t.cat] || 0) + t.paidIn
  }
  const sortDesc = o => Object.entries(o).sort((a, b) => b[1] - a[1])
  return { out: sortDesc(out), inn: sortDesc(inn) }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const fmt0 = n => Math.round(n).toLocaleString('en-KE')

/** plain-language observations about spending behaviour */
export function habits(txns, people) {
  const out = []
  const spend = txns.filter(SPEND)
  if (!spend.length) return out
  const days = new Set(txns.map(t => t.date)).size || 1
  const spanDays = Math.max(1, Math.round((txns[txns.length - 1].dt - txns[0].dt) / 864e5) + 1)
  const total = sum(spend, t => t.withdrawn)

  // daily rhythm
  out.push({ icon: '📅', title: `About KES ${fmt0(total / spanDays)} a day`, body: `${spend.length} payments over ${spanDays} days — ${fmt0(spend.length / spanDays * 7)} a week on average, across ${days} active days.` })

  // day of week
  const byDow = Array(7).fill(0)
  spend.forEach(t => { byDow[t.dt.getDay()] += t.withdrawn })
  const top = byDow.indexOf(Math.max(...byDow))
  out.push({ icon: '🗓️', title: `${DAYS[top]}s are your big spend day`, body: `${((byDow[top] / total) * 100).toFixed(0)}% of spending lands on a ${DAYS[top]}.` })

  // time of day
  const late = spend.filter(t => { const h = +t.time.slice(0, 2); return h >= 22 || h < 5 })
  if (late.length) out.push({ icon: '🌙', title: `${late.length} late-night payments`, body: `KES ${fmt0(sum(late, t => t.withdrawn))} went out between 10pm and 5am — ${((sum(late, t => t.withdrawn) / total) * 100).toFixed(0)}% of spending.` })

  // typical size + biggest
  const sizes = spend.map(t => t.withdrawn).sort((a, b) => a - b)
  const median = sizes[Math.floor(sizes.length / 2)]
  const big = spend.reduce((a, b) => (b.withdrawn > a.withdrawn ? b : a))
  out.push({ icon: '📏', title: `Typical payment: KES ${fmt0(median)}`, body: `Half your payments are under KES ${fmt0(median)}. Biggest single one: KES ${fmt0(big.withdrawn)} to ${titleCase(big.who)} on ${big.date}.` })

  // frequent merchant
  const freq = new Map()
  spend.filter(t => ['Buy Goods (Till)', 'PayBill'].includes(t.cat)).forEach(t => { const k = brandKey(t.who); const m = freq.get(k) || { n: 0, v: 0, who: t.who }; m.n++; m.v += t.withdrawn; freq.set(k, m) })
  const most = [...freq.values()].sort((a, b) => b.n - a.n)[0]
  if (most && most.n >= 3) out.push({ icon: '🏪', title: `${titleCase(brandKey(most.who))} — ${most.n} visits`, body: `Your most frequent merchant: KES ${fmt0(most.v)} in total, roughly every ${Math.max(1, Math.round(spanDays / most.n))} days.` })

  // fuliza
  const draws = txns.filter(t => t.type === 'Fuliza draw')
  if (draws.length) {
    const funded = txns.filter(t => t.fuliza && t.withdrawn > 0 && !t.isCharge && t.cat !== 'Fuliza')
    const maxDraw = Math.max(...draws.map(t => t.paidIn))
    out.push({ icon: '🆘', title: `Fuliza ${draws.length} times`, body: `KES ${fmt0(sum(draws, t => t.paidIn))} borrowed (largest KES ${fmt0(maxDraw)}); ${funded.length} payments were made while overdrawn.` })
  }

  // fees
  const fees = txns.filter(t => t.isCharge)
  if (fees.length) {
    const feeTotal = sum(fees, t => t.withdrawn)
    const sendFees = sum(txns.filter(P2P_SEND), t => t.fee || 0)
    out.push({ icon: '💸', title: `KES ${fmt0(feeTotal)} in charges`, body: `${fees.length} fees — ${((feeTotal / Math.max(1, sum(txns, t => t.withdrawn))) * 100).toFixed(1)}% of all outflow. Sending money to people cost KES ${fmt0(sendFees)} of that.` })
  }

  // people concentration
  if (people?.length) {
    const sent = people.filter(p => p.sent > 0).sort((a, b) => b.sent - a.sent)
    const sentTotal = sum(sent, p => p.sent)
    if (sent.length >= 3 && sentTotal > 0) {
      const top3 = sent.slice(0, 3)
      out.push({ icon: '👥', title: `${sent.length} people received money from you`, body: `${top3.map(p => titleCase(p.name)).join(', ')} account for ${((sum(top3, p => p.sent) / sentTotal) * 100).toFixed(0)}% of what you sent.` })
    }
  }

  // recurring payees (same payee in 3+ distinct months)
  const months = new Map()
  spend.forEach(t => { const k = brandKey(t.who); const s = months.get(k) || { set: new Set(), v: 0, who: t.who }; s.set.add(t.date.slice(0, 7)); s.v += t.withdrawn; months.set(k, s) })
  const recurring = [...months.values()].filter(m => m.set.size >= 3).sort((a, b) => b.v - a.v).slice(0, 4)
  if (recurring.length) out.push({ icon: '🔁', title: `${recurring.length} regular payees`, body: recurring.map(m => `${titleCase(brandKey(m.who))} (${m.set.size} months)`).join(' · ') })

  return out
}

/** exact on letters and digits only: case, spaces and punctuation don't count */
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const digitsOf = s => (s || '').replace(/\D/g, '')
/** a phone's identity: digits without the 254 / 0 prefix, asterisks dropped */
const phoneKey = s => digitsOf(s).replace(/^(?:254|0)/, '')
export const splitTerms = q => q.split(',').map(t => t.trim()).filter(t => norm(t))

/**
 * Relevance search, OR'd across comma-separated terms. For each term the most
 * precise tier that has results wins:
 *   3 exact  — letters/digits equal the name, phone, till/PayBill, account or receipt
 *   2 word   — the term is a whole word of the counterparty's name
 *   1 partial — the term appears inside the name, number, code or details
 */
const words = s => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
/** small Levenshtein for typo suggestions (names are short) */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i
    for (let j = 1; j <= b.length; j++) { const tmp = prev[j]; prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1)); diag = tmp }
  }
  return prev[b.length]
}
export function search(txns, q) {
  const terms = splitTerms(q)
  if (!terms.length) return null
  const tierOf = (t, rawTerm) => {
    const term = norm(rawTerm)
    if (!term) return 0
    const who = t.isCharge && t.parentWho ? t.parentWho : t.who
    const phone = t.isCharge ? (t.parentPhone || '') : t.phone
    const code = t.isCharge ? (t.parentCode || '') : t.code
    if (norm(who) === term || norm(brandKey(who)) === term) return 3
    if (phone && phoneKey(phone).length >= 6 && phoneKey(phone) === phoneKey(rawTerm)) return 3
    if (code && norm(code) === term) return 3
    if (t.account && norm(t.account) === term) return 3
    if (norm(t.receipt) === term) return 3
    if (words(who).includes(term)) return 2
    const hay = norm(who + ' ' + phone + ' ' + code + ' ' + t.account + ' ' + t.receipt + ' ' + t.details)
    if (term.length >= 3 && hay.includes(term)) return 1
    return 0
  }
  // best available tier per term, then the rows at that tier
  const tiers = terms.map(term => Math.max(0, ...txns.map(t => tierOf(t, term))))
  const counts = terms.map(() => 0)
  const rows = txns.filter(t => {
    let hit = false
    terms.forEach((term, i) => { if (tiers[i] && tierOf(t, term) === tiers[i]) { counts[i]++; hit = true } })
    return hit
  })
  const TIER_LABEL = { 3: 'exact', 2: 'name contains the word', 1: 'partial match', 0: 'no match' }
  const termInfo = terms.map((term, i) => ({ term, count: counts[i], tier: tiers[i], how: TIER_LABEL[tiers[i]] }))
  // for terms that matched nothing at any tier, offer the closest names / numbers
  const unmatched = termInfo.filter(x => !x.count)
  const suggestions = unmatched.map(({ term }) => {
    const seen = new Map(); const nt = norm(term)
    for (const t of txns) {
      for (const c of [t.who, t.phone, t.code].filter(Boolean)) {
        const n = norm(c)
        // loose: shares a 3+ letter prefix with any word, or digits overlap
        const close = nt.length >= 3 && (words(c).some(w => (w.startsWith(nt.slice(0, 3)) && (w.includes(nt.slice(0, 4)) || nt.includes(w.slice(0, 4)))) || (nt.length >= 4 && editDistance(w, nt) <= (nt.length >= 5 ? 2 : 1))) || (digitsOf(term).length >= 4 && digitsOf(c).includes(digitsOf(term))))
        if (close) { const k = t.phone && n === norm(t.phone) ? t.phone : c; seen.set(k, (seen.get(k) || 0) + 1) }
      }
    }
    return { term, options: [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([value, n]) => ({ value, n })) }
  })
  const sent = rows.filter(P2P_SEND), recv = rows.filter(P2P_RECV)
  const paid = rows.filter(t => t.withdrawn > 0 && !t.isCharge)
  const people = buildPeople(rows).sort((a, b) => b.total - a.total)
  return {
    rows, terms: termInfo, suggestions,
    sentN: sent.length, sent: sum(sent, t => t.withdrawn),
    recvN: recv.length, recv: sum(recv, t => t.paidIn),
    paidN: paid.length, paid: sum(paid, t => t.withdrawn),
    inn: sum(rows, t => t.paidIn), out: sum(rows, t => t.withdrawn),
    fees: sum(rows.filter(t => !t.isCharge), t => t.fee || 0),
    people,
    cats: categoryTotals(rows),
  }
}

export function toCsv(rows) {
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const head = ['Date', 'Time', 'Receipt', 'Type', 'Category', 'Counterparty', 'Phone', 'Code', 'Account', 'Paid in', 'Withdrawn', 'Fee', 'Balance', 'Details']
  const lines = rows.map(t => [t.date, t.time, t.receipt, t.type, t.cat, t.who, t.phone, t.code, t.account, t.paidIn || '', t.withdrawn || '', t.fee || '', t.balance ?? '', t.details].map(esc).join(','))
  return head.map(esc).join(',') + '\n' + lines.join('\n')
}

// ---------- charges report ----------
const FEE_LABEL = d =>
  /transfer of funds charge/i.test(d) ? 'Send money fee' :
  /pay ?bill charge/i.test(d) ? 'PayBill fee' :
  /pay merchant charge/i.test(d) ? 'Buy Goods fee' :
  /withdrawal charge/i.test(d) ? 'Withdrawal fee' :
  /airtime|bundle/i.test(d) ? 'Airtime fee' :
  d.replace(/\s+/g, ' ').slice(0, 28)

export function chargesReport(txns) {
  const fees = txns.filter(t => t.isCharge && t.withdrawn > 0)
  const out = txns.reduce((s, t) => s + t.withdrawn, 0)
  const total = fees.reduce((s, t) => s + t.withdrawn, 0)
  if (!fees.length) return { total: 0, n: 0, out, pct: 0, byType: [], byParent: [], byMonth: [], topPeople: [], sends: null, biggest: null }

  const agg = (arr, keyFn) => {
    const m = new Map()
    for (const t of arr) { const k = keyFn(t); const v = m.get(k) || { v: 0, n: 0 }; v.v += t.withdrawn; v.n++; m.set(k, v) }
    return [...m.entries()].map(([k, v]) => [k, v.v, v.n])
  }
  const byType = agg(fees, t => FEE_LABEL(t.details)).sort((a, b) => b[1] - a[1])
  const parentCat = new Map(txns.filter(t => !t.isCharge).map(t => [t.receipt + '|' + t.key, t.cat]))
  const byParent = agg(fees, t => (t.parentKey ? parentCat.get(t.receipt + '|' + t.parentKey) : null) || 'Other').sort((a, b) => b[1] - a[1])
  const months = [...new Set(txns.map(t => t.date.slice(0, 7)))].sort()
  const monthMap = new Map(agg(fees, t => t.date.slice(0, 7)).map(([k, v, n]) => [k, { v, n }]))
  const outMonth = new Map()
  for (const t of txns) if (t.withdrawn > 0) outMonth.set(t.date.slice(0, 7), (outMonth.get(t.date.slice(0, 7)) || 0) + t.withdrawn)
  const byMonth = months.map(k => [k, monthMap.get(k)?.v || 0, monthMap.get(k)?.n || 0, outMonth.get(k) || 0])

  // who cost the most in send-money fees
  const pm = new Map()
  for (const t of txns) if (P2P_SEND(t) && t.fee > 0) { const p = pm.get(t.key) || { key: t.key, name: t.who, phone: t.phone, fees: 0, n: 0, sent: 0 }; p.fees += t.fee; p.n++; p.sent += t.withdrawn; pm.set(t.key, p) }
  const topPeople = [...pm.values()].sort((a, b) => b.fees - a.fees).slice(0, 5)

  const sendsAll = txns.filter(P2P_SEND)
  const free = sendsAll.filter(t => !t.fee).length
  const sends = sendsAll.length ? { n: sendsAll.length, free, avgFee: sendsAll.reduce((s, t) => s + (t.fee || 0), 0) / Math.max(1, sendsAll.length - free), avgPct: sendsAll.filter(t => t.fee).reduce((s, t) => s + t.fee / t.withdrawn, 0) / Math.max(1, sendsAll.length - free) * 100 } : null
  const biggest = fees.reduce((a, b) => (b.withdrawn > a.withdrawn ? b : a))
  return { total, n: fees.length, out, pct: out ? (total / out) * 100 : 0, byType, byParent, byMonth, topPeople, sends, biggest, perDay: total / Math.max(1, Math.round((txns[txns.length - 1].dt - txns[0].dt) / 864e5) + 1) }
}

// ---------- autosuggest index ----------
/** distinct counterparties for type-ahead: people (by phone) and brands (by name) */
export function buildIndex(txns) {
  const m = new Map()
  for (const t of txns) {
    if (t.isCharge || !t.who) continue
    const isPerson = !!t.phone
    const key = isPerson ? 'p:' + t.key : 'b:' + brandKey(t.who)
    const e = m.get(key) || { key, label: t.who, value: isPerson ? t.phone : t.who, sub: isPerson ? t.phone : (t.code ? (t.cat === 'Buy Goods (Till)' ? 'Till ' : 'PayBill ') + t.code : t.cat), kind: isPerson ? 'person' : 'merchant', n: 0, last: t.date, cat: t.cat }
    e.n++; if (t.date > e.last) { e.last = t.date; e.label = t.who }
    m.set(key, e)
  }
  return [...m.values()].sort((a, b) => b.n - a.n)
}

/** rank index entries for a typed fragment: word-prefix first, then substring, then digits */
export function suggest(index, fragment, limit = 8) {
  const f = norm(fragment)
  if (f.length < 2) return []
  const d = digitsOf(fragment)
  const score = e => {
    const ws = words(e.label)
    if (ws.some(w => w === f)) return 4
    if (ws.some(w => w.startsWith(f))) return 3
    if (norm(e.label).includes(f)) return 2
    if (d.length >= 3 && digitsOf(e.value + ' ' + e.sub).includes(d)) return 1
    return 0
  }
  const already = e => norm(e.value) === f || (d.length >= 6 && digitsOf(e.value).replace(/^(?:254|0)/, '') === d.replace(/^(?:254|0)/, ''))
  return index.map(e => ({ e, s: score(e) })).filter(x => x.s > 0 && !already(x.e))
    .sort((a, b) => b.s - a.s || b.e.n - a.e.n).slice(0, limit).map(x => x.e)
}
