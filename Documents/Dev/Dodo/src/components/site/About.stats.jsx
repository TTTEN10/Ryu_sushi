export default function AboutStats() {
  const stats = [
    { value: '10+', label: 'Années d\'expérience' },
    { value: '500+', label: 'Consultations réalisées' },
    { value: '98%', label: 'Satisfaction client' },
    { value: '24/7', label: 'Support disponible' },
  ]

  return (
    <section className="about-stats">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}