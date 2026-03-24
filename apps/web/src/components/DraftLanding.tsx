import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Heart, Users, AlertCircle, CheckCircle, Loader2, ArrowRight, Sparkles, CalendarCheck, Brain, BadgeCheck, MessageSquareHeart } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'
import { useOffline } from '../hooks/useOffline'
import { useToast } from '../hooks/useToast'
import { getActionableErrorMessage, fetchWithErrorHandling } from '../utils/errorMessages'
import { FAQ_ITEMS } from '../data/faq'
import FAQAccordion from './FAQAccordion'

interface SignupResponse {
  success: boolean
  message: string
}

export default function DraftLanding() {
  const { isOffline } = useOffline()
  const { showToast, ToastContainer } = useToast()
  const [formData, setFormData] = useState({ email: '', preference: 'individual', consentGiven: false })
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const ctaLabel = useMemo(() => (isOffline ? 'Queue chat request' : 'Chat with Dr. Safe'), [isOffline])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            preference: formData.preference,
            consentGiven: formData.consentGiven,
          }),
        }
      )
      const data: SignupResponse = await response.json()
      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message)
        showToast('success', data.message)
        setFormData({ email: '', preference: 'individual', consentGiven: false })
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
        <div className="container-max section-padding py-8 lg:py-12 space-y-14 lg:space-y-20 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-28 -left-20 w-72 h-72 rounded-full bg-primary-400/20 blur-3xl animate-pulse" />
          <div className="pointer-events-none absolute top-64 -right-24 w-72 h-72 rounded-full bg-secondary-400/20 blur-3xl animate-pulse" />

          <section className="mb-6">
            <div className="max-w-5xl mx-auto bg-white/70 dark:bg-black/30 backdrop-blur-sm rounded-3xl border border-neutral-dark/20 dark:border-white/20 p-6 sm:p-8 lg:p-12">
              <p className="inline-flex items-center gap-2 text-sm sm:text-base text-heading mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Psychological support with a safe approach
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-heading leading-tight font-normal fade-in">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-bold">
                  A safe, inclusive and research-backed space to understand yourself.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-body leading-relaxed mt-6 max-w-3xl">
                For people who feel emotionally overloaded, stuck in overthinking, or disconnected in relationships.
                Chat with Dr. Safe for structured reflection between sessions, while keeping control of your data.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/beta/chat" className="btn-primary inline-flex items-center justify-center gap-2 text-base sm:text-lg px-6">
                  Chat with Dr. Safe
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#journey" className="btn-secondary inline-flex items-center justify-center text-base sm:text-lg px-6">
                  Explore
                </a>
              </div>
            </div>
          </section>

          <section id="journey">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Do you feel like this?</span>
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  'You feel stuck but do not know why',
                  'You overthink everything and feel exhausted',
                  'Your relationships feel heavy lately',
                ].map((pain) => (
                  <div key={pain} className="p-5 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                    <p className="text-body text-base sm:text-lg">{pain}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Services simplified</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <article className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <p className="text-sm text-body mb-2">Need</p>
                <h3 className="text-xl text-heading mb-2">I feel overwhelmed</h3>
                <p className="text-body mb-4">Outcome: clearer emotions and practical coping structure.</p>
                <p className="text-body text-sm mb-4">Solution: individual support flow with Dr. Safe + therapist preparation prompts.</p>
                <Link to="/beta/chat" className="text-primary-600 dark:text-primary-400 font-semibold inline-flex items-center gap-2">Start now <ArrowRight className="w-4 h-4" /></Link>
              </article>
              <article className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <p className="text-sm text-body mb-2">Need</p>
                <h3 className="text-xl text-heading mb-2">My relationship is struggling</h3>
                <p className="text-body mb-4">Outcome: better communication and less emotional escalation.</p>
                <p className="text-body text-sm mb-4">Solution: guided reflection prompts and journaling before difficult conversations.</p>
                <Link to="/beta/chat" className="text-primary-600 dark:text-primary-400 font-semibold inline-flex items-center gap-2">Try chat preview <ArrowRight className="w-4 h-4" /></Link>
              </article>
              <article className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <p className="text-sm text-body mb-2">Need</p>
                <h3 className="text-xl text-heading mb-2">I need clarity</h3>
                <p className="text-body mb-4">Outcome: clearer pattern recognition before your next session.</p>
                <p className="text-body text-sm mb-4">Solution: structured prompts, summaries, and exportable insights.</p>
                <Link to="/beta/chat" className="text-primary-600 dark:text-primary-400 font-semibold inline-flex items-center gap-2">Open Dr. Safe <ArrowRight className="w-4 h-4" /></Link>
              </article>
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">How it works</span>
            </h2>
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
              {[
                { icon: CalendarCheck, title: '1. Book or start chat', copy: 'Open chat in seconds or prepare for your next therapy session.' },
                { icon: Brain, title: '2. Understand your situation', copy: 'Use prompts to map emotions, triggers, and relationship patterns.' },
                { icon: MessageSquareHeart, title: '3. Work toward change', copy: 'Turn insights into small, realistic actions you can follow this week.' },
              ].map((step) => (
                <div key={step.title} className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                  <step.icon className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-3" />
                  <h3 className="text-lg text-heading mb-2">{step.title}</h3>
                  <p className="text-body">{step.copy}</p>
                </div>
              ))}
            </div>
            <p className="max-w-3xl mx-auto text-center text-body mt-6">Expected timeline: first useful reflection in under 5 minutes, then a weekly routine between sessions.</p>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Why you can trust Dr. Safe</span>
            </h2>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <BadgeCheck className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Privacy & security:</strong> AES-256-GCM at rest, TLS 1.3 in transit, and no chat-content logging. Keys are derived from your wallet and not stored on SafePsy servers.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <Shield className="w-7 h-7 text-primary-600 dark:text-primary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Clinical boundaries:</strong> Dr. Safe is not a substitute for licensed therapy and does not provide diagnosis or medical treatment.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <Users className="w-7 h-7 text-accent-600 dark:text-accent-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Compliance language:</strong> we implement measures aimed at GDPR compliance and support HIPAA-style safeguards (no HIPAA certification claim).</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <Heart className="w-7 h-7 text-secondary-600 dark:text-secondary-400 mb-3" />
                <p className="text-body text-sm sm:text-base"><strong className="text-heading">Transparency:</strong> DID operations run on Sepolia Testnet; on-chain metadata is public, while chat content is off-chain and encrypted.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Case-style transformations</span>
            </h2>
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <p className="text-sm text-body mb-2">Before</p>
                <p className="text-body mb-4">"I freeze before difficult conversations."</p>
                <p className="text-sm text-body mb-2">After several guided chats</p>
                <p className="text-body">A user-prepared conversation outline with calmer language and clear boundaries to bring into therapy.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <p className="text-sm text-body mb-2">Before</p>
                <p className="text-body mb-4">"My thoughts spin at night and I lose track."</p>
                <p className="text-sm text-body mb-2">After consistent use</p>
                <p className="text-body">A simple reflection routine: trigger -&gt; emotion -&gt; coping action, ready to discuss with a therapist.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Pricing transparency</span>
            </h2>
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 mb-8">
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <h3 className="text-xl text-heading mb-2">Beta</h3>
                <p className="text-body font-semibold mb-2">Free</p>
                <p className="text-body text-sm">Start now and help shape the product through feedback.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <h3 className="text-xl text-heading mb-2">Premium</h3>
                <p className="text-body font-semibold mb-2">$19/month (doc target)</p>
                <p className="text-body text-sm">Extended quotas in the target model. Current implementation keeps a single premium path around $20.</p>
              </div>
              <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/20 bg-white/70 dark:bg-black/20">
                <h3 className="text-xl text-heading mb-2">Gold</h3>
                <p className="text-body font-semibold mb-2">$69/month (doc target)</p>
                <p className="text-body text-sm">Unlimited quotas in the documented model, including wallet cashback when fully implemented.</p>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 max-w-2xl mx-auto">
              <h3 className="text-xl sm:text-2xl text-heading mb-2 text-center">Start in 2 steps</h3>
              <p className="text-body text-center mb-6">Leave your email and your current priority. We keep it short to reduce friction.</p>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" aria-label="Join waitlist form" noValidate>
                <div className="space-y-2">
                  <label htmlFor="draft-email" className="block text-base sm:text-lg font-medium text-heading">Email *</label>
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
                    placeholder="you@example.com"
                  />
                  <span id="draft-email-help" className="sr-only">Enter a valid email address to join our waitlist</span>
                  {status === 'error' && !formData.email.trim() && (
                    <div className="form-error" id="draft-email-error" role="alert">
                      <AlertCircle className="form-error-icon" />
                      <span>Please enter your email address</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="draft-preference" className="block text-base sm:text-lg font-medium text-heading">Current priority *</label>
                  <select
                    id="draft-preference"
                    name="preference"
                    value={formData.preference}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 text-base sm:text-lg border-2 rounded-xl focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm border-neutral-300 focus:border-primary-500 min-h-[44px]"
                  >
                    <option value="individual">I feel overwhelmed</option>
                    <option value="relationship">My relationship is struggling</option>
                    <option value="clarity">I need clarity</option>
                  </select>
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
                      I consent to SafePsy collecting and processing my personal data for beta access and updates. I have read and agree to the{' '}
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
                        <span>Submitting...</span>
                      </>
                    ) : isOffline ? (
                      'Queue request'
                    ) : (
                      'Get beta access'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section id="faq">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-8 text-center">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Frequently asked questions
              </span>
            </h2>
            <FAQAccordion items={FAQ_ITEMS} answerClassName="text-xs sm:text-sm" />
          </section>

          <section className="mb-12">
            <div className="max-w-5xl mx-auto text-center bg-white/70 dark:bg-black/30 border border-neutral-dark/20 dark:border-white/20 rounded-3xl p-8 sm:p-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-3">You do not have to figure this out alone.</h2>
              <p className="text-body mb-6">Start with one safe conversation now, then move forward at your own pace.</p>
              <Link to="/beta/chat" className="btn-primary inline-flex items-center gap-2 text-base sm:text-lg px-7">
                Chat with Dr. Safe
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </section>
        </div>
      </main>
      <div className="fixed bottom-4 right-4 z-40">
        <Link
          to="/beta/chat"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full shadow-xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold hover:scale-105 active:scale-95 transition-transform"
          aria-label="Open chat with Dr. Safe"
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <Footer />
      <ToastContainer />
    </div>
  )
}
