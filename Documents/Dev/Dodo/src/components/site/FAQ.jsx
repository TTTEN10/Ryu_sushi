import { useState } from 'react'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: "Dois-je savoir précisément ce que je veux travailler avant de consulter ?",
      answer: "Non. Il est fréquent de ressentir qu'une situation ne nous convient plus sans parvenir à identifier précisément ce qu'il faudrait changer. Nous pouvons partir de ce que vous vivez aujourd'hui.",
    },
    {
      question: "Comment savoir si votre approche me correspond ?",
      answer: "C'est notamment l'objectif de la première consultation : découvrir ma manière de travailler et voir si vous vous sentez suffisamment à l'aise.",
    },
    {
      question: "Combien de séances faut-il prévoir ?",
      answer: "Il n'existe pas de nombre identique pour tout le monde. Cela dépend de votre situation et de la manière dont l'accompagnement évolue.",
    },
    {
      question: "À quelle fréquence ont lieu les séances ?",
      answer: "La fréquence est définie ensemble selon vos besoins, vos disponibilités et le travail engagé. Elle peut évoluer au cours de l'accompagnement.",
    },
    {
      question: "Comment se déroulent les consultations en ligne ?",
      answer: "Les consultations ont lieu en visioconférence, depuis un endroit calme où vous pourrez échanger librement et confidentiellement.",
    },
    {
      question: "Puis-je arrêter l'accompagnement à tout moment ?",
      answer: "Oui. L'accompagnement repose sur votre engagement volontaire et vous pouvez décider de l'interrompre lorsque vous le souhaitez.",
    },
    {
      question: "Les séances peuvent-elles être remboursées ?",
      answer: "Certaines mutuelles proposent une prise en charge partielle ou forfaitaire des consultations psychologiques, selon les garanties prévues dans votre contrat. Le remboursement dépend de votre couverture et des conditions fixées par votre mutuelle. Je vous invite à vérifier directement auprès d'elle le montant pris en charge et le nombre de séances concernées. Une facture pourra vous être remise afin d'effectuer votre demande de remboursement, si votre mutuelle l'accepte.",
    },
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="mk-faq" id="faq">
      <div>
        <p className="mk-kicker">QUESTIONS FRÉQUENTES</p>
        <h2>Vous vous posez peut-être encore quelques questions.</h2>
      </div>
      <div>
        {faqs.map((faq, index) => (
          <details key={index} open={openIndex === index}>
            <summary onClick={() => toggleFAQ(index)}>
              {faq.question}
              <span>{openIndex === index ? '−' : '+'}</span>
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}