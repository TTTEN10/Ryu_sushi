import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, Users, AlertCircle, CheckCircle, Loader2, Zap, Lock, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'
import { FAQ_ITEMS } from '../data/faq'

interface SignupResponse {
  success: boolean
  message: string
}

export default function DraftLanding() {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({ email: '', consentGiven: false })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim() || !formData.consentGiven) {
      setStatus('error')
      setMessage('Please enter your email and give consent.')
      return
    }
    if (isOffline) {
      showToast('info', "You're offline. Try again when connected.")
      return
    }
    setIsLoading(true)
    setStatus('idle')
    try {
      const response = await fetchWithErrorHandling(
        `${import.meta.env.VITE_API_URL || '/api'}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim().toLowerCase(), consentGiven: formData.consentGiven }),
        }
      )
      const data: SignupResponse = await response.json()
      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        showToast('success', data.message)
        setFormData({ email: '', consentGiven: false })
      } else {
        setStatus('error')
        setMessage(getActionableErrorMessage(null, { status: response.status, originalMessage: data.message }))
      }
    } catch (err) {
      setStatus('error')
      setMessage(getActionableErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main-content" className="flex-1" role="main" aria-label="Draft landing" tabIndex={-1}>
        <div className="container-max section-padding py-8 lg:py-12 space-y-16 lg:space-y-24">
          {/* 1. Hero: who / what / why now */}
          <section className="mb-12">
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight font-normal fade-in">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  Private mental wellness support—you keep control of your data.
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-body leading-relaxed">
                <strong className="text-heading">Who:</strong> People in or considering therapy, and anyone who wants AI-assisted reflection without giving up data ownership.
              </p>
              <p className="text-lg sm:text-xl text-body leading-relaxed">
                <strong className="text-heading">What:</strong> SafePsy is a privacy-first platform. Connect your wallet, create your on-chain identity (DID), and chat with Dr. Safe—our ethical AI assistant for between-session support.
              </p>
              <p className="text-lg sm:text-xl text-body leading-relaxed">
                <strong className="text-heading">Why now:</strong> Mental health support should be safer and more private. We don’t use your chats to train AI, we don’t store your data with third parties, and your encryption keys stay in your control.
              </p>
              <div className="pt-2">
                <Link
                  to="/about-us"
                  className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  aria-label="Learn more about SafePsy"
                >
                  Learn more
                </Link>
              </div>
            </div>
          </section>

          {/* 2. Problem → cost of problem */}
          <section className="mb-12 sm:mb-16">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  The problem
                </span>
              </h2>
              <p className="text-body text-lg leading-relaxed mb-4">
                Most mental-health tools and AI chatbots hold your data on their servers, use it for analytics or model training, and leave you with no real ownership. That creates risk for stigma, breaches, and loss of control when you’re at your most vulnerable.
              </p>
              <p className="text-body text-lg leading-relaxed font-medium text-heading">
                The cost: you either skip digital support, or you accept that your reflections and conversations are no longer fully yours.
              </p>
            </div>
          </section>

          {/* 3. What SP does (3 steps) */}
          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-10 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                How SafePsy works
              </span>
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center border border-primary-200 dark:border-primary-700">
                  <Lock className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-heading">1. Connect & create your identity</h3>
                <div className="text-body text-sm sm:text-base space-y-2 text-left">
                  <p>Connect your wallet and create your DID (on-chain identity). Your identity is cryptographically secured and tied to you—SafePsy does not hold custody of it.</p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-secondary-100 dark:bg-secondary-900/30 rounded-full flex items-center justify-center border border-secondary-200 dark:border-secondary-700">
                  <MessageSquare className="w-7 h-7 text-secondary-600 dark:text-secondary-400" />
                </div>
                <h3 className="text-lg font-semibold text-heading">2. Chat with Dr. Safe</h3>
                <div className="text-body text-sm sm:text-base space-y-2 text-left">
                  <p>Have a private conversation with our ethical AI assistant. Prepare for sessions, reflect, practice coping strategies, or organize your thoughts. Dr. Safe is not a substitute for a therapist—it complements licensed care.</p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center border border-accent-200 dark:border-accent-700">
                  <Shield className="w-7 h-7 text-accent-600 dark:text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold text-heading">3. Your data stays yours</h3>
                <div className="text-body text-sm sm:text-base space-y-2 text-left">
                  <p>Chat and summary data are encrypted at rest (AES-256-GCM). Keys are derived from your wallet and are not stored on our servers. We do not use your chat content to train models. You can export, manage, or delete your data.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Trust section (accurate, non-hype) */}
          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Trust & transparency
              </span>
            </h2>
            <div className="max-w-3xl mx-auto space-y-6 text-body text-sm sm:text-base">
              <p><strong className="text-heading">Encryption:</strong> Chat and summary data are encrypted at rest using AES-256-GCM; only ciphertext is stored. Data is transmitted over TLS 1.3. Sensitive content is encrypted client-side before sending. To provide AI responses, message content is decrypted temporarily in server memory only during the request; plaintext is not written to disk, logs, or database.</p>
              <p><strong className="text-heading">Keys:</strong> Encryption keys are derived from your wallet and are not stored on SafePsy servers. You control your keys.</p>
              <p><strong className="text-heading">Privacy:</strong> We do not log chat message content. We do not use your chat content to train our models. We do not send user identifiers or DID information to the AI service—only message content as required for responses. Chat content is processed by a third-party AI provider; their data-handling policies apply to that content.</p>
              <p><strong className="text-heading">Identity:</strong> DID operations run on Sepolia Testnet (check the app for current network). DID identifiers and metadata are on-chain and public; chat content is not stored on-chain.</p>
              <p><strong className="text-heading">Compliance:</strong> We implement measures aimed at GDPR compliance and support HIPAA-style safeguards. We are not HIPAA certified. We aim to operate in line with APA guidelines for professional ethics; we do not certify compliance with any specific body.</p>
              <p><strong className="text-heading">AI:</strong> The AI assistant is not a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment. Always consult licensed professionals for clinical decisions.</p>
            </div>
          </section>

          {/* 5. Use cases (2–3) */}
          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Use cases
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/50 dark:bg-black/20 text-center flex flex-col items-center">
                <Zap className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-heading mb-2">Between therapy sessions</h3>
                <p className="text-body text-sm">Reflect, clarify thoughts, and prepare for appointments in a private space. Track patterns and practice coping strategies without leaving a trail on traditional platforms.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/50 dark:bg-black/20 text-center flex flex-col items-center">
                <Heart className="w-10 h-10 text-secondary-600 dark:text-secondary-400 mb-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-heading mb-2">Taking the first step</h3>
                <p className="text-body text-sm">A low-pressure, confidential entry point. Not ready to book a therapist? Use Dr. Safe to organize emotions and explore support—with keys and data in your control.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/50 dark:bg-black/20 sm:col-span-2 lg:col-span-1 text-center flex flex-col items-center">
                <Users className="w-10 h-10 text-accent-600 dark:text-accent-400 mb-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-heading mb-2">Global, privacy-first access</h3>
                <p className="text-body text-sm">Wallet-based authentication and transparent pricing. Access support regardless of geography, with privacy by design.</p>
              </div>
            </div>
          </section>

          {/* 6. CTA + pricing / waitlist */}
          <section className="mb-12 sm:mb-16 fade-in">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto">
              <h2 className="text-xl sm:text-2xl lg:text-3xl text-heading mb-2 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Get early access
                </span>
              </h2>
              <p className="text-body text-center mb-6 sm:mb-8">
                We offer free-tier usage and premium options; pricing is transparent and shown in the app. Join the waitlist for early access and product updates.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
                <div className="space-y-2">
                  <label htmlFor="draft-email" className="block text-base sm:text-lg font-medium text-heading">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="draft-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading || isOffline}
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={status === 'error' && !formData.email.trim()}
                    aria-describedby="draft-email-error draft-email-help"
                    className={`w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:opacity-50 min-h-[44px] hover:border-primary-400/50 ${
                      status === 'error' && !formData.email.trim()
                        ? 'border-red-500 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                        : 'border-neutral-300 focus:border-primary-500'
                    }`}
                    placeholder="Enter your email address"
                  />
                  <span id="draft-email-help" className="sr-only">Enter a valid email address to join our waitlist</span>
                  {status === 'error' && !formData.email.trim() && (
                    <div className="form-error" id="draft-email-error" role="alert">
                      <AlertCircle className="form-error-icon" />
                      <span>Please enter your email address</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="draft-consent"
                      name="consentGiven"
                      checked={formData.consentGiven}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      aria-required="true"
                      aria-invalid={status === 'error' && !formData.consentGiven}
                      className="mt-1 w-5 h-5 text-primary-600 border-2 border-neutral-300 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 min-w-[20px] min-h-[20px]"
                    />
                    <label htmlFor="draft-consent" className="text-xs sm:text-sm text-body leading-relaxed">
                      I consent to SafePsy collecting and processing my personal data for the purpose of joining the waitlist and receiving product updates. I have read and agree to the{' '}
                      <Link to="/tos" className="text-primary-600 hover:text-primary-700 underline font-medium break-words" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/sap-policy" className="text-primary-600 hover:text-primary-700 underline font-medium break-words" target="_blank" rel="noopener noreferrer">
                        Security and Privacy Policy
                      </Link>
                      . *
                    </label>
                  </div>
                </div>
                {isOffline && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-300">
                      You&apos;re offline. Your request will be queued and sent when you&apos;re back online.
                    </span>
                  </div>
                )}
                {status !== 'idle' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-4 rounded-lg flex items-center gap-3 fade-in ${
                      status === 'success'
                        ? 'bg-primary-50 text-primary-800 border border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-500/50'
                        : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-500/50'
                    }`}
                  >
                    {status === 'success' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{message}</span>
                  </div>
                )}
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isLoading || isOffline}
                    aria-label={isLoading ? 'Submitting your request' : 'Join the SafePsy waitlist'}
                    aria-busy={isLoading}
                    className="flex items-center justify-center gap-2 mx-auto min-h-[44px] w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        <span>Joining...</span>
                      </>
                    ) : isOffline ? (
                      'Queue for Later (Offline)'
                    ) : (
                      'Join Waitlist'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* 7. FAQ (top 10) */}
          <section id="faq">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Frequently asked questions
              </span>
            </h2>
            <div className="max-w-3xl mx-auto space-y-1">
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
                    <p className="text-body text-xs sm:text-sm pb-4 pl-0 pr-8 whitespace-pre-line">
                      {item.a}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  )
}
