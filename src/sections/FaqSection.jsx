import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, defaultViewport } from '../animations/variants';
import { FAQ_ITEMS } from '../constants';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="section" aria-label="Questions fréquentes">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="section-label">FAQ</p>
          <h2 className="section-title">Questions Fréquentes</h2>
          <p className="section-subtitle center description">
            Tout ce qu&apos;il faut savoir sur le food truck Ryu Sushi à Paris.
          </p>
        </motion.div>

        <motion.div
          className="faq-list mt-48"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          role="list"
        >
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <article key={faq.question} className="faq-item" role="listitem">
                <button
                  type="button"
                  className="faq-item__question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-item__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <p className="faq-item__answer">{faq.answer}</p>
                )}
              </article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
