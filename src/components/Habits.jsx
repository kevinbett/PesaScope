import Section from './Section.jsx'

export default function Habits({ id, items }) {
  if (!items.length) return null
  return (
    <Section id={id} title="Spending habits" sub="Patterns worth knowing, read straight from your statement.">
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
    </Section>
  )
}
