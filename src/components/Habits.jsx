export default function Habits({ items }) {
  if (!items.length) return null
  return (
    <section className="panel">
      <h2>Spending habits</h2>
      <p className="lede">Patterns worth knowing, read straight from your statement.</p>
      <div className="habits">
        {items.map((h, i) => (
          <div className="habit" key={i}>
            <span className="hicon" aria-hidden="true">{h.icon}</span>
            <div>
              <div className="htitle">{h.title}</div>
              <div className="hbody">{h.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
