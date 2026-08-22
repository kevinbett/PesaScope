import { useState } from 'react'

/** a dashboard panel with a collapsible body and an anchor for the jump bar */
export default function Section({ id, title, sub, defaultOpen = true, innerRef, className = '', children, right }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={'panel section' + (open ? '' : ' collapsed') + (className ? ' ' + className : '')} id={id} ref={innerRef}>
      <div className="section-head">
        <button className="section-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={id + '-body'}>
          <span className="chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
          <h2>{title}</h2>
        </button>
        {right}
      </div>
      {open && (
        <div id={id + '-body'} className="section-body">
          {sub && <p className="lede">{sub}</p>}
          {children}
        </div>
      )}
    </section>
  )
}
