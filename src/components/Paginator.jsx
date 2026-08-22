import { useEffect } from 'react'

export const PAGE_SIZES = [10, 25, 50, 100]

/** shared pagination strip: range readout, first/prev/next/last, rows-per-page */
export default function Paginator({ total, page, setPage, pageSize, setPageSize, sizes = PAGE_SIZES, noun = 'rows' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(page, pages)
  useEffect(() => { if (page !== cur) setPage(cur) }, [page, cur, setPage])
  if (total <= sizes[0]) return null
  const start = (cur - 1) * pageSize
  const end = Math.min(total, start + pageSize)
  return (
    <div className="paginator">
      <span className="pg-range">{(start + 1).toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()} {noun}</span>
      {pages > 1 && (
        <nav className="pg-nav" aria-label="Pages">
          <button className="pg-btn" onClick={() => setPage(1)} disabled={cur === 1} aria-label="First page">«</button>
          <button className="pg-btn" onClick={() => setPage(cur - 1)} disabled={cur === 1} aria-label="Previous page">‹</button>
          <span className="pg-info" aria-live="polite">Page {cur.toLocaleString()} of {pages.toLocaleString()}</span>
          <button className="pg-btn" onClick={() => setPage(cur + 1)} disabled={cur === pages} aria-label="Next page">›</button>
          <button className="pg-btn" onClick={() => setPage(pages)} disabled={cur === pages} aria-label="Last page">»</button>
        </nav>
      )}
      <label className="pg-size">
        Per page
        <select value={pageSize} aria-label="Rows per page" onChange={e => { setPageSize(+e.target.value); setPage(1) }}>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  )
}

/** slice helper so list components stay tiny */
export function pageSlice(items, page, pageSize) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const cur = Math.min(page, pages)
  const start = (cur - 1) * pageSize
  return { rows: items.slice(start, start + pageSize), start }
}
