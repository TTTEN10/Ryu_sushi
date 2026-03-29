import React from 'react'
import { Shield, Heart, Users, Brain, Lock, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { FAQ_ITEMS } from '../data/faq'
import FAQAccordion from './FAQAccordion'

const Explore: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="About SafePsy" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="text-[1.08em] stagger-item">About</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  SafePsy
                </span>
              </h1>
            </div>

            {/* Mission Section (aligned with draft landing) */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 sm:mb-12 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Our Mission
                </span>
              </h2>
              <div className="text-center max-w-4xl mx-auto space-y-4 text-[1.2em] px-4">
                <p className="text-body leading-relaxed">
                  Mental health support safer, more private, and globally accessible.
                </p>
                <p className="text-body leading-relaxed text-[1.1em]">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">SafePsy</span> combines:
                </p>
                <p className="text-body leading-relaxed">
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold text-xl sm:text-2xl lg:text-3xl">
                    Ethical AI assistance. Blockchain-secured identity. End-to-end encrypted.
                  </span>
                </p>
                <p className="text-body leading-relaxed pt-2 font-medium text-heading">
                  You own your data. We do not store it with third parties or use it to train AI models.
                </p>
              </div>
            </div>

            {/* Values Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
              <div className="space-y-4 text-center stagger-item group">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-primary-600">Secure</h3>
                <p className="text-body">
                  Security is the foundation of SafePsy's ecosystem: Data is encrypted at rest and in transit, and encryption keys are controlled by you (derived from your wallet). Message content is processed by our AI provider to generate responses; we do not log or persistently store plaintext.
                </p>
              </div>

              <div className="space-y-4 text-center stagger-item group">
                <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Heart className="w-8 h-8 text-secondary-600 dark:text-secondary-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-secondary-600">Ethical</h3>
                <p className="text-body">
                  In adequacy with APA guidelines and psychologists deontology, we uphold the highest standards of professional ethics in mental health online services.
                </p>
              </div>

              <div className="space-y-4 text-center stagger-item group">
                <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <Users className="w-8 h-8 text-accent-600 dark:text-accent-400 icon-hover" />
                </div>
                <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-accent-600">Human-centered</h3>
                <p className="text-body">
                  At SafePsy, technology serves people, not the other way around. Human dignity and care are at the heart of everything we build.
                </p>
              </div>
            </div>

            {/* Technology Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 sm:mb-12 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Our Technology
                </span>
              </h2>
              <p className="text-base sm:text-lg text-body leading-relaxed text-center max-w-4xl mx-auto mb-8 sm:mb-12 px-4">
                SafePsy integrates artificial intelligence, blockchain, and secure digital identity to transform the way therapy and mental health support are delivered worldwide. Users control their own data through decentralized identity, verified directly on the blockchain, ensuring privacy and compliance at every step. An AI-powered therapy assistant provides immediate support, helping users prepare for sessions, reflect between appointments, and access guidance in moments of need.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="space-y-4 text-center stagger-item group">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <Brain className="w-8 h-8 text-primary-600 dark:text-primary-400 icon-hover" />
                  </div>
                  <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-primary-600">AI-Powered</h3>
                  <p className="text-body">
                    Our AI assistant don't use your data for training, it evolves through psychology-informed training. It helps users prepare, reflect, and complement human psychologists.
                  </p>
                </div>

                <div className="space-y-4 text-center stagger-item group">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <Lock className="w-8 h-8 text-secondary-600 dark:text-secondary-400 icon-hover" />
                  </div>
                  <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-secondary-600">Blockchain Security</h3>
                  <p className="text-body">
                    The backbone of our security: decentralized identity on the blockchain provides transparency and trust, and ensures users own and control their identity and encryption keys.
                  </p>
                </div>

                <div className="space-y-4 text-center stagger-item group">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <Globe className="w-8 h-8 text-accent-600 dark:text-accent-400 icon-hover" />
                  </div>
                  <h3 className="text-xl text-heading transition-colors duration-200 group-hover:text-accent-600">Global Access</h3>
                  <p className="text-body">
                    Both psychologists and patients can use the platform from anywhere in the world with our accessible pricing.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section id="faq" className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 sm:mb-12 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Frequently asked questions
                </span>
              </h2>
              <FAQAccordion items={FAQ_ITEMS} answerClassName="text-sm sm:text-base" />
            </section>

            {/* Call to Action */}
            <div className="text-center px-4 fade-in">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-4 sm:mb-6 stagger-item">
                Ready to Experience the Future of Mental Health Care?
              </h2>
              <p className="text-base sm:text-lg text-body mb-6 sm:mb-8 max-w-2xl mx-auto stagger-item">
                Join our waitlist to be among the first to experience safe online-therapy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center stagger-item">
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] w-full sm:w-auto hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  Join Our Waitlist
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Explore
