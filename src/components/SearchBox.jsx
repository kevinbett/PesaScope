import { useEffect, useRef } from 'react'
import { titleCase } from '../lib/insights.js'

/** the search field: tokens, live fragment, suggestions, Clear / Use controls, '/' shortcut */
export default function SearchBox({ q, setQ, terms }) {
  const { committed, fragment, labelFor, removeChip, onType, sugs, setSugOpen, sugIdx, setSugIdx, applySuggestion, onKey } = terms
  const blurTimer = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const onSlash = e => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', onSlash); return () => window.removeEventListener('keydown', onSlash)
  }, [])

  return (
    <div
      className={'searchbar' + (q ? ' active' : '') + (committed.length ? ' has-tokens' : '')}
      onClick={e => { if (e.target === e.currentTarget || e.target.classList.contains('tokens')) inputRef.current?.focus() }}
    >
      <span className="sicon" aria-hidden="true">⌕</span>
      {committed.length > 0 && (
        <span className="tokens">
          {committed.map((term, i) => (
            <span className="token" key={i + term}>
              {labelFor(term)}
              <button type="button" className="token-x" aria-label={'Remove ' + term} onMouseDown={e => e.preventDefault()} onClick={() => removeChip(i)}>✕</button>
            </span>
          ))}
        </span>
      )}
      <input
        ref={inputRef}
        type="search" value={fragment}
        onChange={e => { onType(e.target.value); setSugOpen(true); setSugIdx(0) }}
        onFocus={() => { clearTimeout(blurTimer.current); setSugOpen(true) }}
        onBlur={() => { blurTimer.current = setTimeout(() => setSugOpen(false), 150) }}
        onKeyDown={onKey}
        placeholder={committed.length ? 'Add another…' : 'Search a name, phone, till, PayBill or receipt — a comma adds another'}
        aria-label="Search transactions" autoComplete="off"
        role="combobox" aria-expanded={sugs.length > 0} aria-controls="suggest-list" aria-autocomplete="list"
      />
      {sugs.length > 0
        ? <button className="suse" onMouseDown={e => e.preventDefault()} onClick={() => applySuggestion(sugs[sugIdx])} aria-label="Use the highlighted suggestion">Use <kbd>↵</kbd></button>
        : q
          ? <button className="sclear" onClick={() => { setQ(''); setSugOpen(false) }} aria-label="Clear search"><span aria-hidden="true">✕</span> Clear</button>
          : <kbd className="skbd" aria-hidden="true">/</kbd>}
      {sugs.length > 0 && (
        <ul className="suggest" id="suggest-list" role="listbox">
          {sugs.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === sugIdx} className={i === sugIdx ? 'sel' : ''}
                onMouseDown={ev => { ev.preventDefault(); applySuggestion(e) }} onMouseEnter={() => setSugIdx(i)}>
              <span className="s-kind" aria-hidden="true">{e.kind === 'person' ? '👤' : '🏪'}</span>
              <span className="s-main"><span className="s-label">{titleCase(e.label)}</span><span className="s-sub">{e.sub}</span></span>
              <span className="s-n">{e.n} txn{e.n === 1 ? '' : 's'}</span>
              <span className="s-use" aria-hidden="true">{i === sugIdx ? 'Use ↵' : 'Use →'}</span>
            </li>
          ))}
          <li className="s-hint" aria-hidden="true">↑↓ to move · Enter or click to use · a comma adds another · Esc to keep what you typed</li>
        </ul>
      )}
    </div>
  )
}
