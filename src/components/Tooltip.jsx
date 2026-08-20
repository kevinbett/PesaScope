import { useCallback, useRef, useState } from 'react'

/** shared floating tooltip — one instance, positioned near the cursor */
export function useTooltip() {
  const [tip, setTip] = useState(null)
  const ref = useRef(null)

  const showTip = useCallback((content, ev) => {
    const pad = 14
    let x = ev.clientX + pad
    let y = ev.clientY + pad
    const el = ref.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (x + Math.max(r.width, 180) > window.innerWidth - 8) x = ev.clientX - Math.max(r.width, 180) - pad
      if (y + r.height > window.innerHeight - 8) y = ev.clientY - r.height - pad
    }
    setTip({ content, x, y })
  }, [])

  const hideTip = useCallback(() => setTip(null), [])

  const tooltipEl = (
    <div
      id="tooltip"
      ref={ref}
      className={tip ? 'show' : ''}
      style={tip ? { left: tip.x, top: tip.y } : undefined}
    >
      {tip?.content}
    </div>
  )

  return { showTip, hideTip, tooltipEl }
}
