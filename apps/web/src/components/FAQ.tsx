import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { FAQ_ITEMS } from '../data/faq'

const FAQ: React.FC = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      <main id="main-content" className="flex-1" role="main" aria-label="FAQ" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading leading-tight mb-4">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  Frequently asked questions
                </span>
              </h1>
            </div>

            <div className="max-w-3xl mx-auto space-y-1 mb-12 sm:mb-16">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="border-b border-neutral-200 dark:border-white/20">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                    className="w-full py-3 sm:py-4 flex items-center justify-between gap-3 text-left min-h-[44px] hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                    aria-expanded={openFaqIndex === i}
                    aria-controls={`faq-answer-${i}`}
                    id={`faq-question-${i}`}
                  >
                    <span className="text-heading font-medium text-sm sm:text-base">{item.q}</span>
                    {openFaqIndex === i ? (
                      <ChevronUp className="w-4 h-4 text-body flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-body flex-shrink-0" />
                    )}
                  </button>
                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      openFaqIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-body text-sm sm:text-base pb-4 pl-0 pr-8 whitespace-pre-line">
                      {item.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/contact-us"
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] inline-flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default FAQ
