export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const fmt = n => Math.round(n).toLocaleString('en-KE')
export const fmtKES = n => 'KES ' + fmt(n)
export const short = v => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v))
export const dayLbl = d => +d.slice(8, 10) + ' ' + MONTHS[+d.slice(5, 7) - 1]
export const monthOf = t => t.date.slice(0, 7)
export const monthLbl = k => MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4)
