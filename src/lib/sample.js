import { enrich, linkCharges } from './parser-core.js'

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = a => a[Math.floor(Math.random() * a.length)]
const rc = () => 'SAM' + Math.random().toString(36).slice(2, 9).toUpperCase()

/** two months of plausible synthetic transactions, clearly labeled as sample */
export function makeSample() {
  const now = new Date()
  const txns = []
  let bal = 8400
  const mk = (daysAgo, details, inn, out, opts = {}) => {
    const dt = new Date(now.getTime() - daysAgo * 864e5 - (opts.hour != null ? (24 - opts.hour) : ri(6, 18)) * 36e5)
    bal = bal + inn - out
    const e = enrich(details)
    txns.push({
      receipt: opts.receipt || rc(),
      dt, date: dt.toISOString().slice(0, 10), time: dt.toISOString().slice(11, 19),
      details, cat: e.cat, type: e.type, who: e.who, key: e.key,
      phone: e.phone || '', code: e.code || '', account: e.account || '',
      fuliza: !!e.fuliza, isCharge: !!e.isCharge, pochi: !!e.pochi,
      paidIn: inn, withdrawn: out, balance: Math.max(bal, 0),
    })
  }
  const send = (day, phone, name, amt, fee = 22) => { const r = rc(); mk(day, `Customer Transfer to - ${phone} ${name}`, 0, amt, { receipt: r }); mk(day, 'Customer Transfer of Funds Charge', 0, fee, { receipt: r }) }
  const bill = (day, code, name, acc, amt, fee = 23) => { const r = rc(); mk(day, `Pay Bill Online to ${code} - ${name} Acc. ${acc}`, 0, amt, { receipt: r }); mk(day, 'Pay Bill Charge', 0, fee, { receipt: r }) }

  for (let day = 55; day >= 0; day--) {
    if (day % 30 === 25) mk(day, 'Business Payment from 774411 - MAKAZI TECH LTD via API. Original conversation ID is x.', 62000, 0)
    if (day % 7 === 3) send(day, '0722***481', 'WANJIKU KAMAU', ri(500, 2500))
    if (day % 9 === 4) send(day, '0711***937', 'OTIENO OKOTH', ri(1000, 6000), 33)
    if (day % 12 === 6) send(day, '0798***204', 'BARAKA SHOP', ri(200, 900), 13)
    if (day % 4 === 1) mk(day, 'Merchant Payment Online to 832909 - NAIVAS SUPERMARKET WESTLANDS', 0, ri(800, 4200))
    if (day % 6 === 2) mk(day, 'Merchant Payment Online to 717201 - CARREFOUR TWO RIVERS ' + pick(['6', '7', '85']), 0, ri(1500, 9000))
    if (day % 9 === 2) bill(day, '888880', 'KPLC PREPAID', '5423981', ri(500, 1500))
    if (day % 11 === 5) bill(day, '4123456', 'ZUKU FIBER', '99120', 4100)
    if (day % 14 === 1) bill(day, '542542', 'IM BANK C2B', '01003206435050', ri(5000, 30000), 55)
    if (day % 5 === 0) mk(day, 'Airtime Purchase For Other 0733***112', 0, ri(50, 300))
    if (day % 13 === 6) { const r = rc(); mk(day, 'Customer Withdrawal At Agent Till 104520 - KIPRO COMMS AGENCIES', 0, ri(1000, 5000), { receipt: r }); mk(day, 'Withdrawal Charge', 0, 67, { receipt: r }) }
    if (day % 17 === 8) mk(day, 'Funds received from - 0711***937 OTIENO OKOTH', ri(500, 3000), 0)
    if (day % 23 === 10) mk(day, 'Funds received from - 0724***118 ACHIENG ODUYA', ri(2000, 8000), 0)
    if (day % 21 === 9) { const r = rc(); mk(day, 'OverDraft of Credit Party - Fuliza M-PESA', ri(500, 1500), 0, { receipt: r }); mk(day, 'Customer Transfer Fuliza MPesa to - 0722***481 WANJIKU KAMAU', 0, ri(500, 1500), { receipt: r }); mk(Math.max(day - 1, 0), 'OD Loan Repayment to 232323 - M-PESA Overdraw', 0, ri(400, 1400)) }
    if (day % 19 === 7) mk(day, 'Merchant Payment to 567123 - QUICKMART RUAKA', 0, ri(600, 2800), { hour: 23 })
    if (day % 27 === 12) bill(day, '525200', 'MADISON INSURANCE', 'POL8812', 3450)
    if (day % 15 === 3) mk(day, 'Unit Trust Invest To 4145555 - ZIIDI MMF by M-PESA\\UnitTrust', 0, ri(500, 5000))
    if (day % 31 === 14) mk(day, 'Pay Bill Online to 5212121 - SportPesa 1 Acc. 0722000', 0, ri(100, 500))
    if (day % 40 === 20) mk(day, 'Transfer from Bank 517819 - IM BANK LIMITED- APP to Customer via API', ri(10000, 40000), 0)
  }
  txns.sort((a, b) => a.dt - b.dt)
  linkCharges(txns)
  return { meta: { name: 'Sample Customer', phone: '0722***000', period: 'last two months' }, summary: {}, txns }
}
