export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const fmt = n => Math.round(n).toLocaleString('en-KE')
export const fmtKES = n => 'KES ' + fmt(n)
export const short = v => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v))
export const dayLbl = d => +d.slice(8, 10) + ' ' + MONTHS[+d.slice(5, 7) - 1]
export const monthOf = t => t.date.slice(0, 7)
export const monthLbl = k => MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4)

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const localISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
/** 'Today' / 'Yesterday' / 'Thursday, 20 Aug 2026' for an ISO date */
export function dayHeading(iso) {
  const d = new Date(iso + 'T12:00:00')
  const now = new Date(); const today = localISO(now)
  const y = new Date(now); y.setDate(now.getDate() - 1)
  const rel = iso === today ? 'Today' : iso === localISO(y) ? 'Yesterday' : null
  const long = DAYS[d.getDay()] + ', ' + +iso.slice(8, 10) + ' ' + MONTHS[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)
  return { rel, long }
}
