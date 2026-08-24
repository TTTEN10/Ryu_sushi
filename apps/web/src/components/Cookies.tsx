import React from 'react'
import { Link } from 'react-router-dom'
import { Cookie, Settings, Shield, Eye, CheckCircle, ExternalLink } from 'lucide-react'
import Header from './Header'
import Footer from './Footer'

const Cookies: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Cookie Policy" tabIndex={-1}>
        <section className="section-padding py-4 lg:py-6">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl text-heading leading-tight mb-4">
                <span className="text-[1.08em]">Cookie</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Policy
                </span>
              </h1>
              <p className="text-lg text-body leading-relaxed max-w-3xl mx-auto">
                SafePsy (OÜ) uses only essential cookies by default. Analytics and functional cookies require your explicit consent. You may withdraw consent at any time. This policy complies with the GDPR and the ePrivacy Directive.
              </p>
              <p className="text-sm text-body mt-4 opacity-75">
                Last updated: August 2026
              </p>
            </div>

            {/* What Are Cookies */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-8">
              <h2 className="text-2xl lg:text-3xl text-heading mb-4 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  What Are Cookies?
                </span>
              </h2>
              <div className="space-y-6">
                <p className="text-lg text-body leading-relaxed text-center max-w-4xl mx-auto">
                  Cookies are small text files stored on your device. SafePsy uses cookies only with your consent (except where strictly necessary for the service to function). We do not sell or share any cookie data with third parties for advertising purposes.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-3 text-center">
                    <div className="w-12 h-12 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                      <Cookie className="w-6 h-6 text-primary-600" />
                    </div>
                    <h3 className="text-base text-heading">Small Files</h3>
                    <p className="text-sm text-body">
                      Tiny text files stored on your device to remember your preferences
                    </p>
                  </div>

                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                      <Settings className="w-8 h-8 text-secondary-600" />
                    </div>
                    <h3 className="text-base text-heading">User Experience</h3>
                    <p className="text-sm text-body">
                      Help personalize your experience and remember your settings
                    </p>
                  </div>

                  <div className="space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                      <Shield className="w-8 h-8 text-accent-600" />
                    </div>
                    <h3 className="text-base text-heading">Privacy Safe</h3>
                    <p className="text-sm text-body">
                      Used responsibly with your privacy and security in mind
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* GDPR Cookie Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-8">
              <h2 className="text-2xl lg:text-3xl text-heading mb-4 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Detailed Cookie Inventory
                </span>
              </h2>
              <p className="text-center text-body mb-6 max-w-3xl mx-auto">
                Every cookie set by SafePsy, classified by purpose, legal basis, and consent requirement under the GDPR and ePrivacy Directive.
              </p>

              {/* Essential Cookies */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl text-heading">Essential Cookies</h3>
                  <span className="ml-auto text-sm font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">No consent required</span>
                </div>
                <p className="text-body mb-6">
                  These cookies are strictly necessary for the website to function. They enable core features such as authentication, security, and load balancing. Without these cookies, the service cannot be provided. Legal basis: <strong>GDPR Art. 6(1)(f)</strong> (legitimate interest).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-neutral-dark/20 dark:border-white/20">
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Cookie Name</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Provider</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Purpose</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Duration</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Legal Basis</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Consent Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">auth_session</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Authentication and session management for wallet-based login</td>
                        <td className="py-3 px-4">Session</td>
                        <td className="py-3 px-4">Art. 6(1)(f) — Legitimate interest</td>
                        <td className="py-3 px-4"><span className="text-green-700 dark:text-green-400 font-semibold">No</span></td>
                      </tr>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">csrf_token</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Cross-site request forgery protection</td>
                        <td className="py-3 px-4">Session</td>
                        <td className="py-3 px-4">Art. 6(1)(f) — Legitimate interest</td>
                        <td className="py-3 px-4"><span className="text-green-700 dark:text-green-400 font-semibold">No</span></td>
                      </tr>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">functional_cookies</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">User-chosen functional preferences (e.g., language, theme) — stored only after consent</td>
                        <td className="py-3 px-4">12 months</td>
                        <td className="py-3 px-4">Art. 6(1)(a) — Consent</td>
                        <td className="py-3 px-4"><span className="text-green-700 dark:text-green-400 font-semibold">No*</span></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-sm">cookie_consent</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Stores your cookie consent preferences (essential-only, analytics, functional, marketing)</td>
                        <td className="py-3 px-4">24 months</td>
                        <td className="py-3 px-4">Art. 6(1)(c) — Legal obligation</td>
                        <td className="py-3 px-4"><span className="text-green-700 dark:text-green-400 font-semibold">No</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-body mt-3 italic opacity-75">
                  * functional_cookies is stored with a 24-month duration but only after the user enables functional cookies in the consent banner.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl text-heading">Analytics Cookies</h3>
                  <span className="ml-auto text-sm font-semibold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">Consent required</span>
                </div>
                <p className="text-body mb-6">
                  These cookies help us understand how visitors interact with our website. All analytics data is self-hosted (no Google servers). We collect anonymous session timing, conversion funnel milestones, and device types — never health data, messages, or wallet addresses in raw form. Legal basis: <strong>GDPR Art. 6(1)(a)</strong> (consent).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-neutral-dark/20 dark:border-white/20">
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Cookie Name</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Provider</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Purpose</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Duration</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Legal Basis</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Consent Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">sp_product_metrics</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Conversion funnel timestamps (landing, wallet connect, DID, first message) — no PII</td>
                        <td className="py-3 px-4">24 months</td>
                        <td className="py-3 px-4">Art. 6(1)(a) — Consent</td>
                        <td className="py-3 px-4"><span className="text-purple-700 dark:text-purple-400 font-semibold">Yes</span></td>
                      </tr>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">analytics_cookies</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Records whether analytics consent was granted</td>
                        <td className="py-3 px-4">24 months</td>
                        <td className="py-3 px-4">Art. 6(1)(c) — Legal obligation</td>
                        <td className="py-3 px-4"><span className="text-purple-700 dark:text-purple-400 font-semibold">Yes*</span></td>
                      </tr>
                      <tr className="border-b border-neutral-dark/10 dark:border-white/10">
                        <td className="py-3 px-4 font-mono text-sm">safepsy_vid</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Anonymous visitor ID (UUID) for counting unique visitors without identifying them</td>
                        <td className="py-3 px-4">12 months</td>
                        <td className="py-3 px-4">Art. 6(1)(a) — Consent</td>
                        <td className="py-3 px-4"><span className="text-purple-700 dark:text-purple-400 font-semibold">Yes</span></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono text-sm">safepsy_sid</td>
                        <td className="py-3 px-4">First-party</td>
                        <td className="py-3 px-4">Anonymous session ID for counting sessions without identifying users</td>
                        <td className="py-3 px-4">30 minutes inactivity</td>
                        <td className="py-3 px-4">Art. 6(1)(a) — Consent</td>
                        <td className="py-3 px-4"><span className="text-purple-700 dark:text-purple-400 font-semibold">Yes</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-body mt-3 italic opacity-75">
                  * analytics_cookies stores the consent decision itself, enabling us to comply with the record-keeping obligation under GDPR Art. 7(1).
                </p>
              </div>

              {/* Third-Party Analytics */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ExternalLink className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl text-heading">Third-Party Analytics (Conditional)</h3>
                  <span className="ml-auto text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">Consent required</span>
                </div>
                <p className="text-body mb-6">
                  The following third-party tools are loaded only after explicit consent. If consent is not given, no scripts are downloaded and no data is transmitted.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-neutral-dark/20 dark:border-white/20">
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Service</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Provider</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Purpose</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Data Transferred</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Legal Basis</th>
                        <th className="py-3 px-4 text-sm font-semibold text-heading">Consent Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-3 px-4 font-mono text-sm">Google Analytics 4</td>
                        <td className="py-3 px-4">Third-party (Google LLC)</td>
                        <td className="py-3 px-4">Web analytics and traffic measurement</td>
                        <td className="py-3 px-4">Page views, session duration, device type, country (via IP geolocation), event names</td>
                        <td className="py-3 px-4">Art. 6(1)(a) — Consent</td>
                        <td className="py-3 px-4"><span className="text-blue-700 dark:text-blue-400 font-semibold">Yes</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-body mt-3 italic opacity-75">
                  Google Analytics scripts are never injected until the user explicitly enables analytics consent. The script tag is dynamically created only after consent is recorded.
                </p>
              </div>
            </div>

            {/* How We Protect Your Data */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-8">
              <h2 className="text-2xl lg:text-3xl text-heading mb-4 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  How We Protect Your Data
                </span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <h3 className="text-xl text-heading">Data Protection Measures</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Self-Hosted Analytics</h4>
                        <p className="text-body">Our primary analytics SDK runs on our own infrastructure. No data passes through Google servers unless you explicitly enable GA4.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">No Raw PII in Cookies</h4>
                        <p className="text-body">Analytics cookies store anonymous UUIDs, timestamps, and coarse device info. No wallet addresses, health data, or messages.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Consent-First Loading</h4>
                        <p className="text-body">No analytics scripts or tracking pixels load until you give explicit consent. Essential cookies only run by default.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl text-heading">Your Rights Under the GDPR</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Right to Withdraw Consent</h4>
                        <p className="text-body">Click "Cookie Preferences" in the footer or use the consent panel in the banner. Withdrawal takes effect immediately.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Right to Access</h4>
                        <p className="text-body">Request a copy of any analytics data we hold about you via our contact form.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Right to Erasure</h4>
                        <p className="text-body">Delete your entire account (including all analytics data) via Account Settings, or contact us directly.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Managing Preferences */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-8">
              <h2 className="text-2xl lg:text-3xl text-heading mb-4 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Managing Your Preferences
                </span>
              </h2>
              <div className="space-y-8">
                <p className="text-lg text-body leading-relaxed text-center max-w-4xl mx-auto">
                  You have full control over your cookie preferences. You can change your choices at any time.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <h3 className="text-xl text-heading">Cookie Consent Manager</h3>
                    <div className="bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <p className="text-body dark:text-white mb-4">
                        SafePsy's consent manager allows you to:
                      </p>
                      <ul className="space-y-2 text-body dark:text-white">
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Accept or reject analytics, functional, and marketing cookies independently
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Withdraw consent previously given — this takes immediate effect
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          View detailed descriptions of every cookie and its purpose
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></span>
                          Save preferences, which are recorded on our backend for audit purposes
                        </li>
                      </ul>
                      <div className="mt-6 text-center">
                        <p className="text-sm text-body dark:text-white opacity-75 mb-2">Open the consent manager from the banner or footer:</p>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-manager'))}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 shadow-md"
                        >
                          <Settings className="w-5 h-5" />
                          Cookie Preferences
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl text-heading">Browser Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Chrome</h4>
                          <p className="text-body">Settings → Privacy and security → Cookies and other site data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Firefox</h4>
                          <p className="text-body">Options → Privacy &amp; Security → Cookies and Site Data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Safari</h4>
                          <p className="text-body">Preferences → Privacy → Manage Website Data</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="text-lg text-heading">Edge</h4>
                          <p className="text-body">Settings → Cookies and site permissions → Cookies and site data</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl text-heading mb-4">
                Questions About Our Cookie Policy?
              </h2>
              <p className="text-base text-body mb-4 max-w-2xl mx-auto">
                If you have any questions about how we use cookies or would like to exercise your rights,{' '}
                <Link
                  to="/contact-us"
                  className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all duration-200"
                >
                  contact us
                </Link>
                .
              </p>
              <p className="text-sm text-body opacity-75">
                SafePsy OÜ · Registered in Estonia · Privacy-enquiry@safepsy.com
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Cookies