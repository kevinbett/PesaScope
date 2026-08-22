import { useMemo, useState } from 'react'
import { splitTerms, suggest, titleCase } from './insights.js'

const alnum = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const phoneDigits = s => (s || '').replace(/\D/g, '').replace(/^(?:254|0)/, '')

/**
 * The search query as email-style tokens: committed terms (before the last
 * comma) plus the live fragment, with identity canonicalisation, dedupe,
 * suggestions and keyboard handling. The query string stays the single
 * source of truth so everything downstream keeps reading `q`.
 */
export function useSearchTerms(q, setQ, index) {
  const [sugOpen, setSugOpen] = useState(false)
  const [sugIdx, setSugIdx] = useState(0)

  const cut = q.lastIndexOf(',')
  const committed = cut >= 0 ? splitTerms(q.slice(0, cut)) : []
  const fragment = (cut >= 0 ? q.slice(cut + 1) : q).replace(/^\s+/, '')

  /** human label for a term: the person's name beside a phone number */
  const labelFor = term => {
    const d = phoneDigits(term)
    const hit = d.length >= 6 ? index.find(e => e.kind === 'person' && phoneDigits(e.value) === d) : null
    return hit ? titleCase(hit.label) + ' · ' + hit.value : (/^\d/.test(term) ? term : titleCase(term))
  }
  /** a full name that is exactly one person becomes that person's phone on commit */
  const canon = term => {
    const k = alnum(term)
    if (!k || /^\d/.test(k)) return term
    const hits = index.filter(e => e.kind === 'person' && alnum(e.label) === k)
    return hits.length === 1 ? hits[0].value : term
  }
  const setParts = (terms, frag) => { const t = splitTerms(terms.map(canon).join(', ')); setQ(t.length ? t.join(', ') + ', ' + frag : frag) }
  const removeChip = i => setParts(committed.filter((_, j) => j !== i), fragment)
  const removeTerm = term => setQ(splitTerms(q).filter(t => t !== term).join(', '))
  /** typing or pasting commas commits everything before the last comma */
  const onType = v => {
    const c = v.lastIndexOf(',')
    if (c < 0) return setParts(committed, v)
    setParts([...committed, ...v.slice(0, c).split(',')], v.slice(c + 1).replace(/^\s+/, ''))
  }
  const sugs = useMemo(() => (sugOpen ? suggest(index, fragment) : []), [index, fragment, sugOpen])
  const applySuggestion = e => { setParts([...committed, e.value], ''); setSugOpen(false); setSugIdx(0) }
  const onKey = ev => {
    if (ev.key === 'Backspace' && !fragment && committed.length) { ev.preventDefault(); removeChip(committed.length - 1); return }
    if (!sugs.length) { if (ev.key === 'Escape') setSugOpen(false); return }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setSugIdx(i => (i + 1) % sugs.length) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSugIdx(i => (i - 1 + sugs.length) % sugs.length) }
    else if (ev.key === 'Enter') { ev.preventDefault(); applySuggestion(sugs[sugIdx]) }
    else if (ev.key === 'Escape') setSugOpen(false)
  }
  return { committed, fragment, labelFor, removeChip, removeTerm, onType, sugs, sugOpen, setSugOpen, sugIdx, setSugIdx, applySuggestion, onKey }
}
