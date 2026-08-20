import React from 'react'
import { Shield, Lock, Eye, Users, FileText, CheckCircle, AlertTriangle, Database, Trash, RefreshCw, WifiOff, Hash, Layers, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const SecurityAndPrivacyPolicy: React.FC = () => {
  const navigate = useNavigate()

  const lastUpdated = 'August 19, 2026'
  const version = '4.0'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Security and Privacy Policy" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="text-[1.08em]">Security and</span>{' '}
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Privacy Policy
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto mb-4">
                Comprehensive data protection and security measures for your mental health journey
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Last Updated: {lastUpdated} | Version: {version}
              </p>
            </div>

            {/* Introduction */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl text-heading mb-6">Introduction</h2>
              <p className="text-base sm:text-lg text-body leading-relaxed mb-4">
                SafePsy ("we," "us," "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mental wellness platform.
              </p>
              <p className="text-base sm:text-lg text-body leading-relaxed mb-6">
                <strong>SafePsy is a privacy-first mental wellness platform</strong> that helps people get private support between therapy sessions without giving up control of their data. We combine wallet-based identity, client-side encryption, and ethical AI to provide a confidential space for reflection and support.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center p-6 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <Lock className="w-12 h-12 mx-auto text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="text-lg font-semibold text-heading mb-2">User-Controlled Encryption</h3>
                  <p className="text-sm text-body">Your encryption keys are derived from your wallet, not stored on our servers</p>
                </div>
                <div className="text-center p-6 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800">
                  <Shield className="w-12 h-12 mx-auto text-secondary-600 dark:text-secondary-400 mb-4" />
                  <h3 className="text-lg font-semibold text-heading mb-2">No Training on Your Data</h3>
                  <p className="text-sm text-body">Your conversations are never used to train AI models</p>
                </div>
                <div className="text-center p-6 rounded-xl bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800">
                  <Eye className="w-12 h-12 mx-auto text-accent-600 dark:text-accent-400 mb-4" />
                  <h3 className="text-lg font-semibold text-heading mb-2">Transparent Processing</h3>
                  <p className="text-sm text-body">This policy clearly explains what data is collected and why</p>
                </div>
              </div>
            </div>

            {/* Security Overview */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Security Overview
                </span>
              </h2>
              <p className="text-base sm:text-lg text-body leading-relaxed text-center max-w-4xl mx-auto mb-6 px-4">
                SafePsy implements comprehensive security measures to protect user data, ensure privacy, 
                and maintain system integrity. Our multi-layer security model is aligned with ISO/IEC 27001:2022 
                and provides enterprise-grade protection for your sensitive mental health information. We record 
                security-relevant events (e.g. authentication) in audit logs with redacted identifiers for incident 
                response and compliance.
              </p>
              <p className="text-base sm:text-lg text-body leading-relaxed text-center max-w-4xl mx-auto mb-8 sm:mb-12 px-4 font-medium text-heading">
                A key differentiator: you own your data. We do not store it with third parties or use it to train AI models.
              </p>

              <div className="max-w-4xl mx-auto mb-10 sm:mb-12 px-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-6 text-left">
                <h3 className="text-xl text-heading font-semibold mb-3">Guest mode and wallet mode</h3>
                <p className="text-body text-sm sm:text-base mb-3">
                  <strong className="text-heading">Guest mode</strong> lets you try the assistant without connecting a wallet.
                  Guest conversations are not written to our databases, are not associated with any wallet or account, and exist
                  only in your browser for that visit (a hard refresh starts a new session). We do not use guest message content
                  for analytics or training. Operational logs avoid storing guest chat text.
                </p>
                <p className="text-body text-sm sm:text-base">
                  <strong className="text-heading">Wallet mode</strong> (after you connect and verify a wallet) enables encrypted
                  storage of your chat history, keys derived from your wallet, and continuity across sessions subject to our
                  technical architecture and terms.
                </p>
              </div>

              <div className="max-w-4xl mx-auto mb-10 sm:mb-12 px-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/60 dark:bg-black/25 p-6 text-left">
                <h3 className="text-xl text-heading font-semibold mb-3">Optional product analytics (cookies)</h3>
                <p className="text-body text-sm sm:text-base mb-3">
                  When you enable <strong className="text-heading">analytics cookies</strong>, SafePsy may set a first-party cookie
                  (<code className="font-mono text-sm">sp_product_metrics</code>) that holds anonymous ISO timestamps for funnel milestones only:
                  landing session start, first wallet connect intent, wallet connected, verified wallet session, DID present,
                  first chat message sent, first assistant reply completed, and whether you returned within 24 hours of a prior browser session.
                  Values do not include wallet addresses, DIDs, names, email, IP, or message content. You can change or withdraw consent via our cookie banner and preference UI;
                  disabling analytics removes this cookie.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Network Security</h3>
                  <p className="text-body">
                    HTTPS/TLS encryption, security headers, rate limiting, and DDoS protection
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700">
                    <Lock className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Data Security</h3>
                  <p className="text-body">
                    AES-256 encryption, DID-based access control, and secure key management
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700">
                    <Eye className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                  </div>
                  <h3 className="text-xl text-heading">Application Security</h3>
                  <p className="text-body">
                    Input validation, authentication, session management, and CSRF protection
                  </p>
                </div>
                
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading">Infrastructure Security</h3>
                  <p className="text-body">
                    Container security, network segmentation, monitoring, and incident response
                  </p>
                </div>
              </div>
            </div>

            {/* Encryption Standards */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Encryption Standards
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl text-heading mb-4">Data Protection</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">AES-256-GCM Encryption</h4>
                        <p className="text-body">Industry-standard encryption for all sensitive data at rest and in transit</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">TLS 1.3</h4>
                        <p className="text-body">Latest transport layer security for secure data transmission</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Wallet-Based Key Derivation</h4>
                        <p className="text-body">Encryption keys derived from wallet signatures using SHA-256 hash. PBKDF2 available for password-based derivation if needed.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">SHA-256 Integrity</h4>
                        <p className="text-body">Data integrity verification and tamper detection</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl text-heading mb-4">Access Control</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">DID-Based Authentication</h4>
                        <p className="text-body">Decentralized identity management with cryptographic key pairs and blockchain verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">User-Controlled Keys</h4>
                        <p className="text-body">Users maintain control over their encryption keys (never stored on servers). Chat data is encrypted client-side before transmission and stored as ciphertext only. Server-side AI processing requires temporary decryption in memory.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Role-Based Permissions</h4>
                        <p className="text-body">Granular access control for therapists and authorized personnel</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-lg text-heading">Audit Logging</h4>
                        <p className="text-body">Access and data operation logs, plus security event logging (e.g. authentication success and failure) for incident response and compliance. Audit logs use redacted identifiers (e.g. partial wallet address) and do not store full PII or secrets.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Protection Rights */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Your Data Protection Rights
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                    <Eye className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Access</h3>
                  <p className="text-body text-center">
                    Access all your personal data processed by SafePsy through our encrypted APIs within 30 days
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                    <FileText className="w-8 h-8 text-secondary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Rectification</h3>
                  <p className="text-body text-center">
                    Correct or update your personal data with encrypted data update mechanisms
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                    <Lock className="w-8 h-8 text-accent-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Erasure</h3>
                  <p className="text-body text-center">
                    Deletion of your off-chain data (e.g. chat history, encrypted blobs) according to our process. On-chain DID lifecycle events are permanent on the blockchain and cannot be erased.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200">
                    <Shield className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Portability</h3>
                  <p className="text-body text-center">
                    Export all your data in a structured, machine-readable format
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200">
                    <Users className="w-8 h-8 text-secondary-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Right to Restrict Processing</h3>
                  <p className="text-body text-center">
                    Limit data processing for specific purposes or data types
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200">
                    <CheckCircle className="w-8 h-8 text-accent-600" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Consent Management</h3>
                  <p className="text-body text-center">
                    Granular consent controls with immediate withdrawal capabilities
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Regulatory Compliance
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl text-heading">GDPR</h3>
                  <p className="text-body">Measures aimed at GDPR compliance: data subject rights (access, rectification, erasure, portability, restriction), lawful bases, and minimization</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                    <CheckCircle className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl text-heading">HIPAA-style safeguards</h3>
                  <p className="text-body">Technical and organizational safeguards supporting HIPAA-style security. We are not a HIPAA-covered entity and do not hold HIPAA certification.</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center border border-purple-200">
                    <CheckCircle className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl text-heading">ISO 27001</h3>
                  <p className="text-body">Security controls and documentation aligned with ISO/IEC 27001:2022. Not certified; certification requires an accredited audit.</p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center border border-orange-200">
                    <CheckCircle className="w-10 h-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl text-heading">APA/EFPA</h3>
                  <p className="text-body">Alignment with APA and EFPA professional ethics and guidelines for psychological services</p>
                </div>
              </div>

              {/* GDPR Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                    GDPR Compliance
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Data Subject Rights Implementation</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Access (Article 15)</p>
                        <p className="text-sm text-body">Complete data export via encrypted APIs within 30 days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Rectification (Article 16)</p>
                        <p className="text-sm text-body">Real-time data correction with cryptographic integrity verification</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Erasure (Article 17)</p>
                        <p className="text-sm text-body">Cryptographic data deletion from all systems and backups</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Right to Portability (Article 20)</p>
                        <p className="text-sm text-body">Machine-readable data export in JSON/XML formats</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Privacy Principles</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Lawfulness & Transparency</p>
                        <p className="text-sm text-body">Clear consent mechanisms and transparent processing</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Purpose Limitation</p>
                        <p className="text-sm text-body">Data processing limited to stated AI reflection and platform functionality purposes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Minimization</p>
                        <p className="text-sm text-body">Only necessary data collected for platform services</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Storage Limitation</p>
                        <p className="text-sm text-body">Automatic deletion after retention periods expire</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HIPAA-style safeguards */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    HIPAA-style safeguards
                  </span>
                </h3>
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Administrative Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Security Officer</p>
                        <p className="text-sm text-body">Designated HIPAA security officer with documented responsibilities</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Workforce Training</p>
                        <p className="text-sm text-body">Regular HIPAA compliance training for all staff</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Access Management</p>
                        <p className="text-sm text-body">Role-based access controls with regular reviews</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Incident Response</p>
                        <p className="text-sm text-body">Documented breach response procedures and reporting</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Physical Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Facility Access</p>
                        <p className="text-sm text-body">Physical access controls for data centers and offices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Workstation Security</p>
                        <p className="text-sm text-body">Secure workstation policies and device controls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Media Controls</p>
                        <p className="text-sm text-body">Secure handling and disposal of electronic media</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Technical Safeguards</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Access Control</p>
                        <p className="text-sm text-body">Unique user identification and authentication</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Audit Controls</p>
                        <p className="text-sm text-body">Comprehensive audit logging and monitoring</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Integrity</p>
                        <p className="text-sm text-body">Cryptographic integrity verification and tamper detection</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Transmission Security</p>
                        <p className="text-sm text-body">Encrypted at rest with client-side key management. Server-side AI processing requires temporary decryption in memory.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ISO 27001 Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                    ISO/IEC 27001:2022 Information Security Management System
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Information Security Management</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">ISMS Alignment</p>
                        <p className="text-sm text-body">Documented scope, policy, and Statement of Applicability aligned with ISO 27001:2022</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Risk Management</p>
                        <p className="text-sm text-body">Risk assessment and treatment process with a risk register</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Annex A Controls</p>
                        <p className="text-sm text-body">93 controls across four domains (Organizational, People, Physical, Technological) with applicability and implementation status</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Security Event Logging</p>
                        <p className="text-sm text-body">Audit trails for authentication and security-relevant events; logs use redacted identifiers and no PII or secrets</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">Security Control Categories</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Access Control (A.5.15–5.18)</p>
                        <p className="text-sm text-body">Wallet/DID authentication, identity management, least privilege</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Cryptography (A.5.35, 8.24)</p>
                        <p className="text-sm text-body">TLS, AES-256, hashing, and secure key management</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Operations Security (A.8.15–8.16)</p>
                        <p className="text-sm text-body">Event logging, monitoring, and secure operations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Secure Development (A.5.36, 8.25–8.28)</p>
                        <p className="text-sm text-body">Secure SDLC, input validation, and secure coding</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* APA/EFPA Compliance Details */}
              <div className="mb-12">
                <h3 className="text-2xl text-heading mb-6 text-center">
                  <span className="bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                    APA/EFPA Compliance
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">American Psychological Association (APA)</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">Ethical Principles</p>
                        <p className="text-sm text-body">Adherence to APA Ethical Principles of Psychologists</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Confidentiality</p>
                        <p className="text-sm text-body">Strong confidentiality protections for therapy data</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Professional Standards</p>
                        <p className="text-sm text-body">Compliance with professional therapy standards</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Competence</p>
                        <p className="text-sm text-body">Maintenance of professional competence and training</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 text-center">
                    <h4 className="text-lg text-heading font-semibold">European Federation of Psychologists' Associations (EFPA)</h4>
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-body font-medium">European Standards</p>
                        <p className="text-sm text-body">Compliance with European psychology standards</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Data Protection</p>
                        <p className="text-sm text-body">Enhanced data protection for European users</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Professional Ethics</p>
                        <p className="text-sm text-body">Adherence to European professional ethics guidelines</p>
                      </div>
                      <div className="text-center">
                        <p className="text-body font-medium">Quality Assurance</p>
                        <p className="text-sm text-body">Continuous quality improvement in therapy services</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-transparent border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg text-heading dark:text-white mb-2">Privacy by Design</h3>
                    <p className="text-body dark:text-white">
                      SafePsy implements privacy-by-design principles throughout our platform. We minimize data collection, 
                      use encrypted at rest with client-side key management (server stores ciphertext only), provide granular consent controls, 
                      and ensure users maintain control over their personal information. Our architecture is built from the ground up to protect your privacy. 
                      Note: Server-side AI processing (Scaleway) requires temporary decryption in memory for chat completions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ID token */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  ID token
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">What is an ID token?</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy gives you complete control over your digital identity through an on-chain ID token (also called a Safe ID Token).
                    Your ID token is a unique record stored on the blockchain that you own and control through your cryptocurrency wallet.
                    Unlike traditional identity systems, your ID token is controlled by your wallet keys. Some lifecycle operations (e.g. revocation) are enforced by the smart contract rules and are recorded on-chain.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">ID token benefits</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">User Ownership</p>
                          <p className="text-sm text-body">You own and control your identity on the blockchain</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Verifiable Credentials</p>
                          <p className="text-sm text-body">Cryptographically verifiable identity without third-party verification</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Privacy-Preserving</p>
                          <p className="text-sm text-body">Minimal data exposure with selective disclosure</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Portable Identity</p>
                          <p className="text-sm text-body">Use your ID token across different platforms and services</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">ID token management</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Blockchain Storage</p>
                          <p className="text-sm text-body">Your ID token is stored on Ethereum blockchain, ensuring immutability and transparency</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Wallet Control</p>
                          <p className="text-sm text-body">Only you can manage your ID token through your wallet's private keys</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Revocation Rights</p>
                          <p className="text-sm text-body">You can revoke your ID token. Revocation is an on-chain lifecycle event and does not erase blockchain history.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Update Capability</p>
                          <p className="text-sm text-body">Update your ID token information while maintaining cryptographic integrity</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    ID token privacy & security
                  </h4>
                  <p className="text-body text-sm leading-relaxed">
                    Your ID token is cryptographically linked to your wallet address. SafePsy never stores your private keys and cannot 
                    access or modify your ID token without your explicit cryptographic signature. All ID token operations are recorded on the 
                    blockchain, providing a transparent and auditable identity management system. Your ID token data can be encrypted and 
                    stored securely, with only you holding the decryption keys.
                  </p>
                </div>
              </div>
            </div>

            {/* AI-Powered Features */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  AI assistant (mental wellness support)
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">AI Service Overview</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy includes an AI assistant designed to complement human therapy sessions. Our AI assistant 
                    helps you prepare for sessions, reflect between appointments, and access guidance when needed. The AI is trained 
                    on psychology-informed principles and is designed to support, not replace, professional mental health care.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">AI Features</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Conversational Support</p>
                          <p className="text-sm text-body">Real-time AI conversations to help process thoughts and emotions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Session Preparation</p>
                          <p className="text-sm text-body">Help organize thoughts and questions before therapy sessions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Between-Session Support</p>
                          <p className="text-sm text-body">Access guidance and reflection tools between appointments</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Streaming Responses</p>
                          <p className="text-sm text-body">Real-time token streaming for natural conversation flow</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading">Data Privacy & AI</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">No Training Data Usage</p>
                          <p className="text-sm text-body">Your conversations are not used to train AI models</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Encrypted Conversations</p>
                          <p className="text-sm text-body">All AI conversations are encrypted and stored securely</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">User Control</p>
                          <p className="text-sm text-body">You can delete AI conversation history at any time</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Third-Party AI Services</p>
                          <p className="text-sm text-body">Chat content is processed by a third-party AI provider to generate responses. Their data handling and retention policies apply to the content they process.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    AI Limitations & Disclaimers
                  </h4>
                  <div className="space-y-2 text-body text-sm leading-relaxed">
                    <p>
                      <strong>Not a Replacement for Professional Care:</strong> The AI assistant is designed to complement, not replace, 
                      professional mental health therapy. It should not be used as a substitute for professional diagnosis or treatment.
                    </p>
                    <p>
                      <strong>No Medical Advice:</strong> The AI assistant does not provide medical advice, diagnosis, or treatment. 
                      Always consult with licensed mental health professionals for clinical decisions.
                    </p>
                    <p>
                      <strong>Emergency Situations:</strong> The AI assistant is not equipped to handle mental health emergencies. 
                      If you are experiencing a crisis, please contact emergency services or a crisis hotline immediately.
                    </p>
                    <p>
                      <strong>Accuracy:</strong> While we strive for accuracy, AI responses may contain errors or be inappropriate for 
                      your specific situation. Use your judgment and consult professionals when needed.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    AI Data Processing
                  </h4>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    When you interact with our AI assistant, the following data is processed:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-body text-sm ml-4">
                    <li>Your conversation messages are sent to a third-party AI provider for processing</li>
                    <li>Conversation history is stored encrypted in our systems for continuity</li>
                    <li>Usage metrics (token counts, response times) are logged for service improvement</li>
                    <li>No personal identifiers are shared with AI service providers beyond what's necessary for the conversation</li>
                    <li>You can request deletion of your AI conversation data at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Categories */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Data Categories & Processing
                </span>
              </h2>
              
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full border-collapse border border-neutral-300 dark:border-gray-600 text-sm sm:text-base">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-gray-800">
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Data Type</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Purpose</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Retention</th>
                        <th className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-left text-heading text-xs sm:text-sm">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Identity Data (DID)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Blockchain-based identity verification and access control</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">User-controlled deletion (blockchain immutable)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Contract</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">AI Conversation Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">AI-powered reflection responses (encrypted storage, server stores ciphertext only)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">30 days (user-configurable, automated deletion)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Health Data (conversations)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">AI reflection responses only; SafePsy acts as technology/AI service provider, not a healthcare provider</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Until user deletion or account closure (automated, not stored after 30 days by default)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Explicit consent (GDPR Art. 9(2)(a))</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Analytics Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Product analytics and usage optimization (aggregated, non-personalized where possible)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">12 months (automated deletion)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Crisis Safety Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Crisis detection and emergency response facilitation</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">30 days (automated purge)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Vital interests / Explicit consent</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Wallet Address</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Authentication, identity binding, and subscription management</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Until account deletion (deleted upon account closure)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent, Contract</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Blockchain / DID Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Decentralized identity anchor; on-chain hashes cannot be modified or deleted</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Permanent (blockchain immutability; off-chain data deleted independently)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent (with acknowledgment of technical limitations)</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">IP Addresses</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Security, abuse prevention, and compliance logging</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">90 days (automated deletion)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Legitimate Interests (security)</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Consent Records</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Demonstrate lawful basis for processing; audit trail for GDPR Art. 5(2) accountability</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">2 years after withdrawal or expiration</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Legal obligation (GDPR Art. 5(2))</td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Technical Data</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Platform security, optimization, and security audit logs (redacted identifiers only)</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">12 months</td>
                        <td className="border border-neutral-300 dark:border-gray-600 px-3 sm:px-4 py-2 sm:py-3 text-body text-xs sm:text-sm">Legitimate Interests</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Explicit Health Data Consent - GDPR Article 9 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-amber-200 dark:border-amber-800 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Explicit Consent for Health Data Processing (GDPR Article 9)
                </span>
              </h2>

              <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <p className="text-body text-sm sm:text-base leading-relaxed">
                    SafePsy processes health-related information you voluntarily share during your conversations with our AI assistant. 
                    Under the General Data Protection Regulation (GDPR), health data is classified as a <strong>special category of personal data</strong> 
                    under <strong>Article 9</strong>, which requires <strong>explicit consent</strong> for processing.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl text-heading mb-3">What This Consent Covers</h3>
                  <p className="text-body text-sm sm:text-base leading-relaxed mb-3">
                    By providing consent for health data processing, you agree to the following:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-body text-sm sm:text-base ml-4">
                    <li>Your mental health-related messages and reflections are processed by our AI assistant to generate supportive responses</li>
                    <li>Your conversations are transmitted securely to our AI service provider (Scaleway) for real-time processing</li>
                    <li>Your health data is used <strong>solely</strong> for generating AI-powered reflection responses within this platform</li>
                    <li>Your conversations are <strong>not</strong> used to train AI models, sold to third parties, or shared for advertising purposes</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl text-heading mb-3">Legal Basis</h3>
                  <div className="space-y-3">
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                      <h4 className="font-semibold text-heading text-sm sm:text-base mb-1">Article 6(1)(a) — Consent (General Data)</h4>
                      <p className="text-body text-sm sm:text-base">
                        Your explicit consent forms the lawful basis for processing personal data through our platform, including identity verification and platform functionality.
                      </p>
                    </div>
                    <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 bg-amber-50/50 dark:bg-amber-900/10">
                      <h4 className="font-semibold text-heading text-sm sm:text-base mb-1">Article 9(2)(a) — Explicit Consent (Health Data)</h4>
                      <p className="text-body text-sm sm:text-base">
                        Your <strong>explicit, informed, and unambiguous consent</strong> is required before any health-related information you provide is processed. This consent is obtained through a dedicated consent flow that clearly explains what health data is processed, why it is needed, and your rights.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl text-heading mb-3">How Consent Is Obtained and Managed</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-heading text-sm sm:text-base">Explicit Consent Flow</h4>
                        <p className="text-body text-sm sm:text-base">
                          Before using the AI assistant, you must expressly check a dedicated consent checkbox confirming you understand and agree to health data processing. Consent is recorded with a timestamp for audit purposes.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-heading text-sm sm:text-base">Granular Control</h4>
                        <p className="text-body text-sm sm:text-base">
                          Health data consent is separate from cookie consent. You can withdraw health data processing consent at any time through your privacy settings, which will not affect the processing of non-health data.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-heading text-sm sm:text-base">Right to Withdraw</h4>
                        <p className="text-body text-sm sm:text-base">
                          You may withdraw your consent for health data processing at any time, for any reason. Withdrawal is immediate and does not affect the lawfulness of processing based on consent before its withdrawal. Upon withdrawal, your health data will no longer be processed by the AI assistant.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-body text-sm sm:text-base leading-relaxed">
                    <strong>Important:</strong> Health data consent is required to use the AI assistant features. Without this consent, you may still browse the platform, but the AI-powered reflection functionality will not be available. Your data is encrypted in transit and processed through Scaleway's Zero Data Retention generative APIs, which do not retain or use prompts to train models.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy by Design - IP Address Handling */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Privacy by Design: IP Address Handling
                </span>
              </h2>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">Default OFF for Maximum Privacy</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy follows privacy by design principles with IP address handling. By default, IP hashing is **disabled** to ensure maximum privacy protection.
                    IP hashing must be explicitly enabled via environment variables if needed for abuse prevention.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading flex items-center gap-2">
                      <WifiOff className="w-6 h-6 text-green-600" />
                      When IP Hashing is OFF (Default)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">No SHA-256 hash computed</p>
                          <p className="text-sm text-body">IP addresses are not stored in any form</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Raw IPs not written to database</p>
                          <p className="text-sm text-body">Database columns store null/undefined</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Logs redacted in production</p>
                          <p className="text-sm text-body">IP field replaced with &lt;REDACTED: ip&gt;</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading flex items-center gap-2">
                      <Hash className="w-6 h-6 text-primary-600" />
                      When IP Hashing is ON (Opt-in)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">SHA-256 with configurable salt</p>
                          <p className="text-sm text-body">Hash computed as SHA-256(ip + IP_SALT)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Salt must be ≥32 characters</p>
                          <p className="text-sm text-body">Validated at startup; hashing refused if invalid</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Database className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-body font-medium">Stored in database for abuse prevention</p>
                          <p className="text-sm text-body">Enables correlation without exposing raw IPs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Environment Configuration
                  </h4>
                  <div className="space-y-2 text-sm text-body">
                    <p className="font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded">IP_HASHING_ENABLED=false  # Default: OFF for maximum privacy</p>
                    <p className="font-mono bg-neutral-100 dark:bg-neutral-800 p-2 rounded">IP_SALT=your-secure-salt-here  # Must be ≥32 characters (use: openssl rand -hex 32)</p>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Security Considerations
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                    <li>Use a strong, unique salt in production (generate with: <code className="font-mono">openssl rand -hex 32</code>)</li>
                    <li>Rotate salt regularly for enhanced security</li>
                    <li>Rate limiting remains effective with or without IP hashing</li>
                    <li>Default OFF ensures maximum privacy protection</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Blockchain and On-Chain Data */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Blockchain and On-Chain Data
                </span>
              </h2>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">What Is Stored On-Chain</h3>
                  <p className="text-body leading-relaxed">
                    SafePsy uses blockchain (Ethereum Sepolia testnet) to store Decentralized Identifiers (DIDs) and related metadata.
                    Understanding what is stored on-chain helps you make informed decisions about your privacy.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3">Data Type</th>
                        <th className="px-6 py-3">Public?</th>
                        <th className="px-6 py-3">Immutable?</th>
                        <th className="px-6 py-3">Can Be Deleted?</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">DID Token ID</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Wallet Address</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Service Endpoint URLs</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Authorization Events</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Chat Blob Hashes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Encrypted Key Metadata</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4">Yes</td>
                        <td className="px-6 py-4 text-red-600">No (permanent)</td>
                      </tr>
                      <tr className="bg-green-50 dark:bg-green-900/20">
                        <td className="px-6 py-4 font-medium">Chat Message Content</td>
                        <td className="px-6 py-4 text-green-600">No</td>
                        <td className="px-6 py-4 text-green-600">No</td>
                        <td className="px-6 py-4 text-green-600">N/A (not stored on-chain)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Privacy Implications
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-body ml-4">
                    <li><strong>Public metadata:</strong> Someone who knows your wallet address can see that you have a DID token</li>
                    <li><strong>Permanent record:</strong> On-chain data cannot be deleted due to blockchain immutability</li>
                    <li><strong>Content remains private:</strong> Only hashes and references are on-chain, not message content</li>
                    <li><strong>Linkage possible:</strong> Events indexed by tokenId can be linked to the same DID across time</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl text-heading">Revocation</h4>
                  <p className="text-body leading-relaxed">
                    You can revoke your DID token from your profile page. Revocation is permanent and cannot be undone.
                    Revoked addresses cannot mint a new DID token. Revocation is recorded on-chain as permanent metadata,
                    but off-chain data (encrypted chat) can still be deleted.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xl text-heading flex items-center gap-2">
                      <Shield className="w-6 h-6 text-primary-600" />
                      Content Privacy
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                      <li>User content encrypted before off-chain storage (AES-256-GCM)</li>
                      <li>Key material on-chain in DID profile field (encryptedKeyMetadata)</li>
                      <li>On-chain references use cryptographic hashes only (not content)</li>
                      <li>Completions use separate plaintext-over-TLS path for AI processing</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl text-heading flex items-center gap-2">
                      <Layers className="w-6 h-6 text-secondary-600" />
                      Off-Chain Data
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                      <li>Encrypted content payloads (chat messages, summaries)</li>
                      <li>Message bodies (encrypted and stored off-chain)</li>
                      <li>Private user attributes (encrypted before storage)</li>
                      <li>Application-level analytics (not stored on-chain)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right to Erasure and Blockchain Limitations */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Right to Erasure and Blockchain Limitations
                </span>
              </h2>

              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-body leading-relaxed text-lg">
                    SafePsy complies with your right to erasure under GDPR Article 17. However, because SafePsy uses blockchain technology for decentralized identity, some data cannot be technically deleted. This section explains exactly what is deleted, what remains, and why.
                  </p>
                </div>

                {/* What Is Deleted */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    What Is Deleted
                  </h3>
                  <p className="text-body mb-4">
                    When you request account deletion via <code className="font-mono text-sm">DELETE /api/account</code>, SafePsy permanently removes the following off-chain data:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-body">
                    <li><strong>Encrypted chat history</strong> — All chat messages, keys, and summaries stored in our database</li>
                    <li><strong>Subscription and payment records</strong> — All billing information, Stripe data, and crypto payment records</li>
                    <li><strong>Crisis opt-in data</strong> — Your name, email address, and emergency contact information</li>
                    <li><strong>RAG audit logs</strong> — All records of document indexing and retrieval operations associated with your wallet</li>
                    <li><strong>Consent records</strong> — All records of consent grants and withdrawals stored in our database</li>
                    <li><strong>Active sessions</strong> — All active authentication sessions are invalidated</li>
                  </ul>
                </div>

                {/* What Cannot Technically Be Deleted */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    What Cannot Technically Be Deleted
                  </h3>
                  <p className="text-body mb-4">
                    The following data exists on the Ethereum blockchain and cannot be modified or removed due to blockchain immutability:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-body">
                    <li><strong>DID token IDs and hashes</strong> — These are cryptographic commitments (SHA-256 hashes) that do not contain personal information</li>
                    <li><strong>Wallet addresses</strong> — Your wallet address is pseudonymous and not directly identifiable without your action to link it to your identity</li>
                    <li><strong>DID lifecycle events</strong> — Records of DID minting, revocation, and key updates are permanent event logs</li>
                    <li><strong>Encrypted key metadata</strong> — An encrypted blob (`{'{signature}'}:{'{iv}'}:{'ciphertext'}`) that is cryptographically unreadable without your wallet</li>
                    <li><strong>Service endpoint URLs</strong> — Public infrastructure URLs for DID Document resolution</li>
                    <li><strong>Data and key hashes</strong> — One-way hashes that cannot be reverse-engineered to identify any individual</li>
                  </ul>
                </div>

                {/* Why It Remains */}
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading">Why It Remains</h3>
                  <div className="space-y-3 text-body">
                    <p>
                      <strong>Ethereum blockchain immutability.</strong> Data committed to a block cannot be modified or removed. This is a fundamental property of the blockchain, not a design choice.
                    </p>
                    <p>
                      <strong>Cryptographic integrity.</strong> On-chain data consists of hashes and cryptographic commitments. These exist to verify system behavior and ensure data integrity — not to identify individuals.
                    </p>
                    <p>
                      <strong>No personal data on-chain.</strong> SafePsy does not store raw personal information (health data, names, emails, IP addresses, chat messages) on the blockchain. All on-chain data is either purely non-personal (hashes, opaque identifiers) or pseudonymous (wallet-address indexed).
                    </p>
                  </div>
                </div>

                {/* Legal Basis */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-4">Legal Basis for On-Chain Retention</h3>
                  <div className="space-y-3 text-body">
                    <p>
                      <strong>GDPR Article 6(1)(f) — Legitimate interest:</strong> Blockchain audit trails ensure system integrity and prevent fraud (e.g., duplicate DID minting after revocation, unauthorized key modifications).
                    </p>
                    <p>
                      <strong>GDPR Article 17(3)(d) — Legal claims:</strong> On-chain records may serve as evidence in legal disputes concerning identity verification or access control.
                    </p>
                    <p>
                      <strong>No material conflict:</strong> Because on-chain data contains no raw personal information, the retention of this data does not materially conflict with the right to erasure. The personal data (off-chain records) is fully deleted.
                    </p>
                  </div>
                </div>

                {/* How SafePsy Minimizes Identification */}
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading">How SafePsy Minimizes On-Chain Identification</h3>
                  <ul className="list-disc list-inside space-y-2 text-body">
                    <li><strong>No raw PII on-chain.</strong> Health data, chat messages, email addresses, names, and IP addresses are NEVER stored on the blockchain.</li>
                    <li><strong>Hash-only references.</strong> All data pointers are one-way cryptographic hashes that cannot be reverse-engineered.</li>
                    <li><strong>Encrypted key blobs.</strong> The <code className="font-mono text-sm">encryptedKeyMetadata</code> field stores only an AES key wrapped by a wallet-derived KEK. Without the user's wallet to re-derive the KEK, the blob is unintelligible.</li>
                    <li><strong>Pseudonymous identifiers.</strong> Wallet addresses are pseudonymous — they do not directly identify a natural person.</li>
                    <li><strong>Separate off-chain storage.</strong> All encrypted content payloads, message bodies, and private user attributes are stored off-chain and are fully deleted on erasure.</li>
                  </ul>
                </div>

                {/* Effect on Decryption/Access */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-4 flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-red-600" />
                    Effect on Your Ability to Decrypt and Access Data
                  </h3>
                  <div className="space-y-3 text-body">
                    <p>
                      <strong>After erasure, your ability to decrypt and access previously stored data is permanently lost.</strong> Here is why:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>When you create a DID, an AES key is wrapped (encrypted) with a Key Encryption Key (KEK) derived from your wallet signature. This wrapped key is stored on-chain as <code className="font-mono text-sm">encryptedKeyMetadata</code>.</li>
                      <li>Off-chain, SafePsy stores references that link this encrypted key to your encrypted chat data.</li>
                      <li>When you request erasure, SafePsy severs ALL database references between your wallet and your data.</li>
                      <li>The encrypted key metadata remains on-chain, but SafePsy no longer holds the database records needed to use it. Even if you still control your wallet and can decrypt the blob, the data it points to no longer exists.</li>
                      <li><strong>Key unlinking = permanent loss of access to all previously stored encrypted data.</strong> This cannot be undone.</li>
                    </ol>
                    <p className="text-sm text-body">
                      <strong>Please confirm you understand this consequence before proceeding with account deletion.</strong>
                    </p>
                  </div>
                </div>

                {/* Optional DID Revocation */}
                <div className="space-y-4">
                  <h3 className="text-xl text-heading">Optional: DID Token Revocation</h3>
                  <p className="text-body">
                    You may optionally revoke your DID token from your profile page. Revocation is permanent and cannot be undone. The revocation event (burning the token and adding your wallet address to the permanent revocation list) is recorded on-chain. Off-chain, the revocation prevents your wallet from minting a new DID.
                  </p>
                  <p className="text-body">
                    Note: Revocation does NOT delete any on-chain data. The DID minting event, token ID, and hash remain permanently on-chain regardless of revocation status.
                  </p>
                </div>
              </div>
            </div>

            {/* Crisis Safety Net Feature */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Crisis Safety Net Feature
                </span>
              </h2>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl text-heading mb-4">What It Is</h3>
                  <p className="text-body leading-relaxed">
                    The Crisis Safety Net is an <strong>optional, opt-in feature</strong> that allows users in crisis to voluntarily
                    provide contact information for follow-up support. This feature is designed to provide additional support
                    during difficult moments while maintaining strict privacy protections.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3">Data Type</th>
                        <th className="px-6 py-3">Encryption</th>
                        <th className="px-6 py-3">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Email address</td>
                        <td className="px-6 py-4">AES-256-GCM (application layer)</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Full name</td>
                        <td className="px-6 py-4">AES-256-GCM (application layer)</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Emergency contact (optional)</td>
                        <td className="px-6 py-4">AES-256-GCM (application layer)</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Language code</td>
                        <td className="px-6 py-4">Plaintext</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Wallet address (pseudonymous link)</td>
                        <td className="px-6 py-4">Database (plaintext)</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4">Consent hash</td>
                        <td className="px-6 py-4">Plaintext (audit trail)</td>
                        <td className="px-6 py-4">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Data NOT Collected
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                    <li>Chat message content</li>
                    <li>Crisis keywords that triggered detection</li>
                    <li>Session data or browsing history</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl text-heading">How to Withdraw</h4>
                  <ul className="list-disc list-inside space-y-1 text-body ml-4">
                    <li><strong>Automatic:</strong> Data deleted after 30 days (no action required)</li>
                    <li><strong>Manual:</strong> Go to <code className="font-mono">/profile</code> → Crisis Safety Net → Withdraw</li>
                    <li><strong>Immediate:</strong> Email privacy@polinapsycho.com</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Rate Limiting Protection
                  </h4>
                  <p className="text-body text-sm">
                    The crisis opt-in endpoint is rate limited to <strong>5 requests per minute</strong> to protect against abuse
                    and ensure fair access to this critical support feature.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Retention Schedule */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Data Retention Schedule
                </span>
              </h2>

              <div className="space-y-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3">Data Type</th>
                        <th className="px-6 py-3">Retention Period</th>
                        <th className="px-6 py-3">Deletion Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Encrypted chat blobs</td>
                        <td className="px-6 py-4">Indefinite (until user deletes)</td>
                        <td className="px-6 py-4">User-initiated deletion from profile</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Crisis opt-in PII</td>
                        <td className="px-6 py-4">30 days from registration</td>
                        <td className="px-6 py-4">Automatic purge (daily cron job)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Wallet address</td>
                        <td className="px-6 py-4">Indefinite (account lifetime)</td>
                        <td className="px-6 py-4">Account deletion removes association</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">DID token</td>
                        <td className="px-6 py-4">Permanent (on-chain)</td>
                        <td className="px-6 py-4">Can be revoked (metadata remains on-chain)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Email subscriptions</td>
                        <td className="px-6 py-4">Until unsubscribe</td>
                        <td className="px-6 py-4">User-initiated unsubscribe link</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Contact messages</td>
                        <td className="px-6 py-4">2 years from submission</td>
                        <td className="px-6 py-4">Automatic deletion</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Security audit logs</td>
                        <td className="px-6 py-4">1 year from event</td>
                        <td className="px-6 py-4">Automatic deletion</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Analytics events (anonymized)</td>
                        <td className="px-6 py-4">14 months</td>
                        <td className="px-6 py-4">Automatic deletion</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Session cookies</td>
                        <td className="px-6 py-4">400 days</td>
                        <td className="px-6 py-4">Automatic expiration</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Guest chat sessions</td>
                        <td className="px-6 py-4">Browser session only</td>
                        <td className="px-6 py-4">Cleared when browser session ends (in-memory only)</td>
                      </tr>
                      <tr className="border-b dark:border-neutral-700">
                        <td className="px-6 py-4 font-medium">Failed authentication attempts</td>
                        <td className="px-6 py-4">24 hours</td>
                        <td className="px-6 py-4">Automatic deletion</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    Automatic Deletion
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                    <li>Crisis opt-in data automatically deleted 30 days after registration via daily database purge</li>
                    <li>Guest chat sessions cleared when browser session ends (in-memory only)</li>
                    <li>Failed authentication attempts deleted after 24 hours</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Trash className="w-5 h-5 text-green-600" />
                    User-Initiated Deletion
                  </h4>
                  <p className="text-body text-sm">
                    You can delete the following at any time from your profile settings (<code className="font-mono">/profile</code>):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4 mt-2">
                    <li>Encrypted chat history</li>
                    <li>Crisis Safety Net registration</li>
                    <li>Email subscription</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Your Privacy Rights (GDPR & CCPA) */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Your Privacy Rights
                </span>
              </h2>

              <div className="space-y-12">
                {/* GDPR Rights */}
                <div>
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-600" />
                    GDPR Rights (EU/EEA/UK Users)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                        <tr>
                          <th className="px-6 py-3">Right</th>
                          <th className="px-6 py-3">How to Exercise</th>
                          <th className="px-6 py-3">Timeline</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Access</td>
                          <td className="px-6 py-4">Email privacy@polinapsycho.com or use Export feature in /profile</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Rectification</td>
                          <td className="px-6 py-4">Update directly in /profile or email us</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Erasure ("Right to be Forgotten")</td>
                          <td className="px-6 py-4">Use Delete feature in /profile or email us</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Restrict Processing</td>
                          <td className="px-6 py-4">Email privacy@polinapsycho.com</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Data Portability</td>
                          <td className="px-6 py-4">Download JSON export from /profile</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Object</td>
                          <td className="px-6 py-4">Email privacy@polinapsycho.com</td>
                          <td className="px-6 py-4">30 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Withdraw Consent</td>
                          <td className="px-6 py-4">Unsubscribe link (email) or delete crisis opt-in in /profile</td>
                          <td className="px-6 py-4">Immediate</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CCPA Rights */}
                <div>
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-secondary-600" />
                    CCPA/CPRA Rights (California Users)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                        <tr>
                          <th className="px-6 py-3">Right</th>
                          <th className="px-6 py-3">How to Exercise</th>
                          <th className="px-6 py-3">Timeline</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Know</td>
                          <td className="px-6 py-4">Email privacy@polinapsycho.com</td>
                          <td className="px-6 py-4">45 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Delete</td>
                          <td className="px-6 py-4">Use Delete feature in /profile or email us</td>
                          <td className="px-6 py-4">45 days</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Opt-Out of Sale</td>
                          <td className="px-6 py-4">N/A (we do not sell personal information)</td>
                          <td className="px-6 py-4">N/A</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Right to Non-Discrimination</td>
                          <td className="px-6 py-4">N/A (built into policy)</td>
                          <td className="px-6 py-4">N/A</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* How to Submit */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    How to Submit a Request
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-body ml-4">
                    <li><strong>Email:</strong> privacy@polinapsycho.com</li>
                    <li><strong>In-app:</strong> Go to <code className="font-mono">/profile</code> → Privacy Settings</li>
                    <li><strong>Mail:</strong> [Insert mailing address]</li>
                  </ol>
                  <p className="text-sm text-body mt-3">
                    We will verify your identity using your wallet signature before processing requests.
                  </p>
                </div>
              </div>
            </div>

            {/* How We Share Your Information */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  How We Share Your Information
                </span>
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl text-heading mb-6">Third-Party Service Providers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-neutral-100 dark:bg-neutral-800">
                        <tr>
                          <th className="px-6 py-3">Provider</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Data Shared</th>
                          <th className="px-6 py-3">Your Rights</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Scaleway Generative API</td>
                          <td className="px-6 py-4">AI chat completions</td>
                          <td className="px-6 py-4">Message content (plaintext, transient)</td>
                          <td className="px-6 py-4">Review their privacy policy; opt-out by not using chat</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Stripe</td>
                          <td className="px-6 py-4">Payment processing</td>
                          <td className="px-6 py-4">Payment info, email (for receipts)</td>
                          <td className="px-6 py-4">Stripe privacy policy applies; you can request data deletion</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Hosting provider (Scaleway, AWS, or self-hosted)</td>
                          <td className="px-6 py-4">Encrypted data storage</td>
                          <td className="px-6 py-4">Ciphertext only (no plaintext access)</td>
                          <td className="px-6 py-4">Data Processing Agreement in place</td>
                        </tr>
                        <tr className="border-b dark:border-neutral-700">
                          <td className="px-6 py-4 font-medium">Sentry (if configured)</td>
                          <td className="px-6 py-4">Error monitoring</td>
                          <td className="px-6 py-4">Redacted error logs (no PII, no message content)</td>
                          <td className="px-6 py-4">Opt-out via browser settings</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    We Do NOT Share Your Data With
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-body ml-4">
                    <li>Data brokers or advertisers</li>
                    <li>Social media platforms (unless you choose to share)</li>
                    <li>Employers or insurance companies</li>
                    <li>Family members or emergency contacts (unless you explicitly request during crisis opt-in)</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl text-heading">Legal Disclosures</h4>
                  <p className="text-body leading-relaxed">
                    We may disclose your information if legally required:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-body ml-4">
                    <li>In response to a court order or subpoena</li>
                    <li>To comply with legal obligations</li>
                    <li>To protect our rights or the safety of users</li>
                    <li>In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Us & Complaints */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Contact Us & Complaints
                </span>
              </h2>

              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xl text-heading flex items-center gap-2">
                      <FileText className="w-6 h-6 text-primary-600" />
                      Data Controller
                    </h3>
                    <div className="space-y-2 text-body">
                      <p className="font-medium">SafePsy</p>
                      <p>[Insert legal entity name once Estonian OÜ is registered]</p>
                      <p>[Insert registered address]</p>
                      <p>Email: [Insert email]</p>
                      <p>Phone: [Insert phone]</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl text-heading flex items-center gap-2">
                      <Shield className="w-6 h-6 text-secondary-600" />
                      Data Protection Officer
                    </h3>
                    <div className="space-y-2 text-body">
                      <p>Email: dpo@polinapsycho.com (or privacy@polinapsycho.com)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="text-lg text-heading mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Privacy Requests
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-body ml-4">
                    <li><strong>Email:</strong> privacy@polinapsycho.com</li>
                    <li><strong>In-app:</strong> <code className="font-mono">/profile</code> → Privacy Settings</li>
                    <li><strong>Response time:</strong> 30 days (GDPR), 45 days (CCPA)</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xl text-heading">Complaints</h4>
                  <p className="text-body leading-relaxed">
                    If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-body ml-4">
                    <li><strong>France:</strong> CNIL (cnil.fr)</li>
                    <li><strong>Estonia:</strong> Andmekaitse Inspektsioon (aki.ee)</li>
                    <li><strong>EU:</strong> Your national DPA (see edpb.europa.eu)</li>
                    <li><strong>California:</strong> California Attorney General</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Research Reference */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Research & References
                </span>
              </h2>

              <div className="space-y-4">
                <p className="text-body leading-relaxed text-center max-w-4xl mx-auto">
                  SafePsy's privacy and security implementations are informed by academic research in telepsychology,
                  data security, and ethical considerations for mental health platforms.
                </p>
                <div className="flex justify-center">
                  <a
                    href="/documentation/public documentation/Data security in psychotherapeutic telepractice - methodological, ethical and ergonomic considerations.md"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>View Academic Research Paper (Université Paris-Nanterre, 2023-2024)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Questions About Your Privacy */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-6">
                Questions About Your Privacy?
              </h2>
              <p className="text-lg text-body mb-8 max-w-2xl mx-auto">
                We're committed to transparency and protecting your privacy. Contact us with any questions about our security measures or data protection practices.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/contact-us')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  Contact Us
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

export default SecurityAndPrivacyPolicy
