export default function Scenarios() {
  const scenarios = [
    {
      quote: "Je doute souvent de ma valeur ou de ma légitimité.",
      description: "Vous vous comparez, vous vous jugez durement ou ressentez le besoin de prouver que vous êtes à la hauteur.",
    },
    {
      quote: "J'ai du mal à trouver ma place avec les autres.",
      description: "Vous n'osez pas toujours aller vers les autres, vous affirmer, exprimer vos besoins ou montrer pleinement qui vous êtes.",
    },
    {
      quote: "Je ne sais pas vraiment quelle direction prendre.",
      description: "Vous vous questionnez sur votre avenir et distinguez difficilement vos souhaits des attentes qui pèsent sur vous.",
    },
    {
      quote: "Je sais ce que j'aimerais faire, mais quelque chose me retient.",
      description: "Le doute, la peur d'échouer, le perfectionnisme ou le regard des autres vous empêchent parfois d'avancer.",
    },
  ]

  return (
    <section className="mk-situations">
      <div className="mk-section-title">
        <p className="mk-kicker">CE QUI VOUS AMÈNE PEUT-ÊTRE ICI</p>
        <h2>Une de ces situations vous parle ?</h2>
        <i className="mk-rule"></i>
        <p>
          Vous ne savez pas précisément ce qui ne va pas ? Vous pouvez simplement partir de ce que vous vivez aujourd'hui.
        </p>
      </div>
      <div className="mk-situation-grid">
        {scenarios.map((scenario, index) => (
          <article key={index} className="mk-reveal-card">
            <h3>{scenario.quote}</h3>
            <p>{scenario.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}