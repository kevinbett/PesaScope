import { categorize, counterparty } from './parser.js'

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = a => a[Math.floor(Math.random() * a.length)]

/** two months of plausible synthetic transactions, clearly labeled as sample */
export function makeSample() {
  const now = new Date()
  const txns = []
  let bal = 8400
  const mk = (daysAgo, details, inn, out) => {
    const dt = new Date(now.getTime() - daysAgo * 864e5 - ri(0, 12) * 36e5)
    bal = bal + inn - out
    txns.push({
      receipt: 'SAM' + String(ri(1000000, 9999999)),
      dt, date: dt.toISOString().slice(0, 10),
      details, cat: categorize(details), who: counterparty(details),
      paidIn: inn, withdrawn: out, balance: Math.max(bal, 0),
    })
  }
  for (let day = 55; day >= 0; day--) {
    if (day % 30 === 25) mk(day, 'Business Payment from 774411 - MAKAZI TECH LTD', 62000, 0)
    if (day % 7 === 3) { mk(day, 'Customer Transfer to - 0722***481 WANJIKU KAMAU', 0, ri(500, 2500)); mk(day, 'Customer Transfer of Funds Charge', 0, 22) }
    if (day % 4 === 1) mk(day, 'Merchant Payment Online to 832909 - NAIVAS SUPERMARKET WESTLANDS', 0, ri(800, 4200))
    if (day % 9 === 2) { mk(day, 'Pay Bill Online to 888880 - KPLC PREPAID Acc. 5423981', 0, ri(500, 1500)); mk(day, 'Pay Bill Charge', 0, 23) }
    if (day % 11 === 5) mk(day, 'Pay Bill Online to 4123456 - ZUKU FIBER Acc. 99120', 0, 4100)
    if (day % 5 === 0) mk(day, 'Airtime Purchase For Other 0733***112', 0, ri(50, 300))
    if (day % 13 === 6) { mk(day, 'Customer Withdrawal At Agent Till 104520 - KIPRO COMMS AGENCIES', 0, ri(1000, 5000)); mk(day, 'Withdrawal Charge', 0, 67) }
    if (day % 17 === 8) mk(day, 'Funds received from - 0711***937 OTIENO OKOTH', ri(500, 3000), 0)
    if (day % 21 === 9) { mk(day, 'OverDraft of Credit Party - Fuliza M-PESA', ri(500, 1500), 0); mk(Math.max(day - 1, 0), 'OD Loan Repayment to 232323 - Fuliza M-PESA', 0, ri(400, 1400)) }
    if (day % 15 === 4) mk(day, 'Customer Transfer to - 0798***204 BARAKA SHOP', 0, ri(200, 900))
    if (day % 19 === 7) mk(day, 'Merchant Payment to 567123 - QUICKMART RUAKA', 0, ri(600, 2800))
    if (day % 27 === 12) mk(day, 'Pay Bill Online to 525200 - MADISON INSURANCE Acc. POL8812', 0, 3450)
  }
  txns.sort((a, b) => a.dt - b.dt)
  return { meta: { name: 'Sample Customer', phone: '0722***000', period: 'last two months' }, txns }
}
