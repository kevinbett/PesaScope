// Opt-in, local-only memory. Holds *metadata the user created* — alias groups
// ("these are the same person") and category fixes — never a statement, never a
// transaction. Persisted to localStorage only while `enabled` is true.
import { useCallback, useEffect, useState } from 'react'
import { brandKey, linkCharges } from './parser-core.js'

export const MEMORY_KEY = 'pesascope.memory.v1'
const EMPTY = { enabled: false, aliases: [], categories: {} }

export function loadMemory() {
  try { const raw = localStorage.getItem(MEMORY_KEY); if (raw) { const m = JSON.parse(raw); return { ...EMPTY, ...m, enabled: true } } } catch {}
  return { ...EMPTY }
}
export function persistMemory(m) {
  try { if (m.enabled) localStorage.setItem(MEMORY_KEY, JSON.stringify({ aliases: m.aliases, categories: m.categories })); else localStorage.removeItem(MEMORY_KEY) } catch {}
}
export function forgetMemory() { try { localStorage.removeItem(MEMORY_KEY) } catch {} }

/** opaque, stable id for a category fix: a hash of receipt + details, so nothing
    readable about the transaction lands in storage (receipts repeat across linked rows) */
export function fixId(t) {
  const s = t.receipt + '|' + (t.details || '')
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return 'f' + (h >>> 0).toString(36)
}

export function useMemory() {
  const [memory, setMemory] = useState(loadMemory)
  useEffect(() => { persistMemory(memory) }, [memory])
  const setEnabled = useCallback(enabled => setMemory(m => ({ ...m, enabled })), [])
  const forget = useCallback(() => { forgetMemory(); setMemory({ ...EMPTY }) }, [])
  /** merge counterparties: keys are phone keys (people) or brand keys (merchants) */
  const merge = useCallback((keys, label) => setMemory(m => {
    const ks = [...new Set(keys.filter(Boolean))]; if (ks.length < 2) return m
    // fold any existing groups touching these keys into one
    const touching = m.aliases.filter(g => g.members.some(k => ks.includes(k)))
    const rest = m.aliases.filter(g => !touching.includes(g))
    const members = [...new Set([...ks, ...touching.flatMap(g => g.members)])]
    return { ...m, aliases: [...rest, { canonical: touching[0]?.canonical || ks[0], label: label || touching[0]?.label || '', members }] }
  }), [])
  const unmerge = useCallback(canonical => setMemory(m => ({ ...m, aliases: m.aliases.filter(g => g.canonical !== canonical) })), [])
  const setCategory = useCallback((t, cat) => setMemory(m => { const c = { ...m.categories }; if (cat) c[fixId(t)] = cat; else delete c[fixId(t)]; return { ...m, categories: c } }), [])
  const clearCategories = useCallback(() => setMemory(m => ({ ...m, categories: {} })), [])
  return { memory, setEnabled, forget, merge, unmerge, setCategory, clearCategories }
}

/** apply aliases + category fixes to parsed transactions (returns new objects) */
export function applyMemory(txns, memory) {
  if (!memory || (!memory.aliases.length && !Object.keys(memory.categories).length)) return txns
  const alias = new Map()
  for (const g of memory.aliases) for (const k of g.members) alias.set(k, g)
  const keyOf = t => t.phone ? t.key : brandKey(t.who)
  return txns.map(t => {
    let n = t
    const g = alias.get(keyOf(t))
    if (g) n = { ...n, key: g.canonical, who: g.label || n.who, rawWho: t.who, rawKey: keyOf(t) }
    if (t.isCharge && t.parentKey) { const pg = alias.get(t.parentKey); if (pg) n = { ...n, parentKey: pg.canonical, parentWho: pg.label || n.parentWho } }
    const fix = memory.categories[fixId(t)]
    if (fix) n = { ...n, cat: fix, fixedCat: true }
    return n
  })
}

/** merge several parsed statements into one: dedupe overlapping rows, re-link fees */
export function mergeStatements(list) {
  const seen = new Set(); const txns = []
  for (const s of list) for (const t of s.txns) {
    const id = t.receipt + '|' + t.date + 'T' + t.time + '|' + t.details + '|' + (t.paidIn || t.withdrawn)
    if (seen.has(id)) continue
    seen.add(id); txns.push({ ...t, dt: new Date(t.dt) })
  }
  txns.sort((a, b) => a.dt - b.dt)
  linkCharges(txns)
  return txns
}
