import React from 'react'
import { FileText, Shield, AlertTriangle, CheckCircle, Users, Lock, Eye, Database, ArrowRight, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import TableOfContents from './TableOfContents'

const DPIA: React.FC = () => {
  const navigate = useNavigate()
  
  const tocSections = [
    { id: 'executive-summary', title: 'Executive Summary', level: 1 },
    { id: 'description-processing', title: 'Description of Processing Activities', level: 1 },
    { id: 'data-flow', title: 'Data Flow', level: 1 },
    { id: 'necessity-proportionality', title: 'Necessity and Proportionality', level: 1 },
    { id: 'risk-assessment', title: 'Risk Assessment', level: 1 },
    { id: 'mitigation-measures', title: 'Mitigation Measures', level: 1 },
    { id: 'no-content-logging', title: 'No-Content-Logging Policy', level: 1 },
    { id: 'compliance-framework', title: 'Compliance Framework', level: 1 },
    { id: 'consultation', title: 'Consultation and Review', level: 1 },
    { id: 'conclusion', title: 'Conclusion', level: 1 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header showBackButton={true} />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="Data Protection Impact Assessment" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Table of Contents */}
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 hidden lg:block">
                <TableOfContents sections={tocSections} />
              </div>
              <div className="lg:col-span-3">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold">
                  Data Protection Impact Assessment
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto">
                Comprehensive assessment of privacy risks and data protection measures for SafePsy's mental health platform
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-body">
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
                  Version 1.0
                </span>
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 dark:border-green-800">
                  Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
                  GDPR Article 35
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div id="executive-summary" className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 scroll-mt-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl text-heading mb-6 sm:mb-8 text-center px-2">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Executive Summary
                </span>
              </h2>
              <div className="space-y-6 text-body leading-relaxed">
                <p className="text-base sm:text-lg">
                  This Data Protection Impact Assessment (DPIA) evaluates the privacy risks associated with SafePsy's 
                  processing of personal data, particularly sensitive health data, in the context of our Web3.0 
                  decentralized mental health therapy platform. The assessment identifies potential risks to data subjects' 
                  rights and freedoms and outlines comprehensive measures to mitigate these risks.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-2">Assessment Scope</h3>
                      <ul className="space-y-2 text-sm sm:text-base text-body">
                        <li>• Processing of sensitive health data (mental health information)</li>
                        <li>• Decentralized identity management using blockchain technology</li>
                        <li>• End-to-end encrypted communication and data storage</li>
                        <li>• Cross-border data transfers and international operations</li>
                        <li>• Automated decision-making and AI-assisted therapy tools</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description of Processing */}
            <div id="description-processing" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Description of Processing Activities
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Users className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Data Subjects</h3>
                      <ul className="space-y-2 text-body">
                        <li>• Therapy clients seeking mental health services</li>
                        <li>• Licensed therapists and mental health professionals</li>
                        <li>• Platform administrators and support staff</li>
                        <li>• Third-party service providers (under strict contracts)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Database className="w-6 h-6 text-secondary-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Categories of Personal Data</h3>
                      <ul className="space-y-2 text-body">
                        <li>• <strong>Health Data:</strong> Mental health assessments, therapy notes, treatment history</li>
                        <li>• <strong>Identity Data:</strong> Decentralized Identifiers (DIDs), wallet addresses</li>
                        <li>• <strong>Communication Data:</strong> Encrypted messages, session recordings</li>
                        <li>• <strong>Technical Data:</strong> IP addresses, device information, usage patterns</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-8">
                <h3 className="text-xl text-heading mb-4">Processing Purposes</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Provision of mental health therapy services</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Secure communication between clients and therapists</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Progress tracking and treatment planning</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Platform security and fraud prevention</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Compliance with legal and regulatory requirements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-body">Service improvement and analytics (anonymized)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                <h3 className="text-xl text-heading mb-4">Legal Basis for Processing</h3>
                <div className="space-y-4 text-body">
                  <div>
                    <strong className="text-heading">Consent (GDPR Article 6(1)(a) & 9(2)(a)):</strong>
                    <p className="mt-1">Explicit consent for processing sensitive health data for therapy services</p>
                  </div>
                  <div>
                    <strong className="text-heading">Contract (GDPR Article 6(1)(b)):</strong>
                    <p className="mt-1">Processing necessary for the performance of therapy service contracts</p>
                  </div>
                  <div>
                    <strong className="text-heading">Vital Interests (GDPR Article 9(2)(c)):</strong>
                    <p className="mt-1">Protection of vital interests in emergency mental health situations</p>
                  </div>
                  <div>
                    <strong className="text-heading">Legitimate Interests (GDPR Article 6(1)(f)):</strong>
                    <p className="mt-1">Platform security, fraud prevention, and service improvement (with balancing test)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Flow */}
            <div id="data-flow" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Data Flow
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <ArrowRight className="w-6 h-6 text-blue-600" />
                    Data Collection and Entry Points
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">User Registration and Authentication:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Users connect via Web3 wallet (MetaMask, WalletConnect, etc.)</li>
                        <li>Decentralized Identifier (DID) is created on blockchain</li>
                        <li>Wallet address stored as pseudonymous identifier</li>
                        <li>No personally identifiable information required for registration</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Therapy Session Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Client-therapist communication encrypted client-side before transmission</li>
                        <li>Encrypted messages sent via secure API endpoints</li>
                        <li>Session notes and assessments encrypted at rest</li>
                        <li>All sensitive content remains encrypted throughout processing</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Technical Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>IP addresses: Not logged by default (privacy-by-design)</li>
                        <li>Device information: Minimal collection for security purposes</li>
                        <li>Usage patterns: Aggregated and anonymized only</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-green-600" />
                    Data Processing and Storage
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Encryption Pipeline:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Client-side encryption using AES-256-GCM before data leaves user device</li>
                        <li>Encrypted data transmitted via TLS 1.3</li>
                        <li>Server receives only encrypted blobs (no plaintext access)</li>
                        <li>Encrypted data stored in secure database with additional encryption at rest</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Blockchain Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>DID registry stored on blockchain (Sepolia testnet, mainnet ready)</li>
                        <li>Only cryptographic hashes and references stored on-chain</li>
                        <li>No sensitive data stored on blockchain</li>
                        <li>User-controlled keys for DID management</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Database Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted chat blobs stored in PostgreSQL database</li>
                        <li>Encrypted therapy notes and assessments</li>
                        <li>Metadata only (timestamps, DID references, encrypted key references)</li>
                        <li>Regular automated backups with encryption</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    Data Access and Sharing
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Access Control:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Role-based access control (RBAC) for therapists and administrators</li>
                        <li>DID-based authentication for all data access</li>
                        <li>Multi-factor authentication for sensitive operations</li>
                        <li>Access logs maintained (metadata only, no content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Data Sharing:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>No data sharing with third parties without explicit consent</li>
                        <li>Service providers bound by Data Processing Agreements (DPAs)</li>
                        <li>Standard Contractual Clauses (SCCs) for international transfers</li>
                        <li>All sharing documented and auditable</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Data Export:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Users can export their encrypted data at any time</li>
                        <li>Export provided in machine-readable format (JSON/XML)</li>
                        <li>Data remains encrypted during export process</li>
                        <li>User controls decryption keys</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-orange-600" />
                    Data Retention and Deletion
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Retention Periods:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Active therapy data: Retained during active service period</li>
                        <li>Historical health records: 7 years (regulatory requirement)</li>
                        <li>Communication data: 30 days (user-configurable)</li>
                        <li>Technical logs: 90 days (metadata only)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Deletion Process:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>User-initiated deletion: Immediate cryptographic deletion</li>
                        <li>Automated deletion after retention periods expire</li>
                        <li>Deletion from all systems including backups</li>
                        <li>Verification of deletion completion</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Backup Management:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted backups stored in geographically distributed locations</li>
                        <li>Backup retention aligned with data retention policies</li>
                        <li>Secure deletion of expired backups</li>
                        <li>Regular backup integrity verification</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Data Flow Diagram Summary</h3>
                  <div className="text-body space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">1. Collection:</span>
                      <span>User Device → Client-Side Encryption → Secure API</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">2. Transmission:</span>
                      <span>TLS 1.3 Encrypted Channel → API Server</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">3. Storage:</span>
                      <span>Encrypted Database → Encrypted Backups</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">4. Access:</span>
                      <span>DID Authentication → Role-Based Access → Decrypted Client-Side Only</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">5. Deletion:</span>
                      <span>Cryptographic Deletion → Verification → Backup Cleanup</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Necessity and Proportionality */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Necessity and Proportionality
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Data Minimization
                  </h3>
                  <p className="text-body mb-4">
                    SafePsy implements strict data minimization principles:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Only essential health data required for therapy is collected</li>
                    <li>No unnecessary personal information is requested or stored</li>
                    <li>Data collection is limited to what is directly relevant to service provision</li>
                    <li>Regular audits ensure compliance with minimization principles</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Purpose Limitation
                  </h3>
                  <p className="text-body mb-4">
                    All data processing is strictly limited to stated purposes:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Health data is used exclusively for therapy provision and progress tracking</li>
                    <li>No secondary use of data without explicit consent</li>
                    <li>Clear purpose specification in privacy notices and terms of service</li>
                    <li>Technical controls prevent unauthorized access or use</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-600" />
                    Storage Limitation
                  </h3>
                  <p className="text-body mb-4">
                    Data retention is limited to necessary periods:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Active therapy data: Retained during active service period</li>
                    <li>Historical records: 7 years (regulatory requirement for health records)</li>
                    <li>Communication data: 30 days (configurable by user)</li>
                    <li>Automated deletion after retention periods expire</li>
                    <li>User-controlled deletion available at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Risk Assessment
                </span>
              </h2>
              
              <div className="space-y-8">
                {/* High Risk */}
                <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl text-heading">High Risk: Unauthorized Access to Health Data</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Potential unauthorized access to sensitive mental health data could result in discrimination, 
                      social stigma, or psychological harm to data subjects.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Low (due to encryption and access controls)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> High (significant impact on data subject rights)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>AES-256-GCM encryption for all data at rest</li>
                        <li>TLS 1.3 for all data in transit</li>
                        <li>DID-based authentication with cryptographic keys</li>
                        <li>Role-based access controls (RBAC)</li>
                        <li>Multi-factor authentication for therapists</li>
                        <li>Regular security audits and penetration testing</li>
                        <li>Comprehensive audit logging</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Medium Risk */}
                <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl text-heading">Medium Risk: Data Loss or Corruption</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Potential loss or corruption of therapy data could impact treatment continuity 
                      and patient care quality.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Low
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> Medium
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Automated daily backups with encryption</li>
                        <li>Geographically distributed backup storage</li>
                        <li>Data integrity verification using SHA-256</li>
                        <li>Version control for critical data</li>
                        <li>Disaster recovery procedures</li>
                        <li>Regular backup restoration testing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Medium Risk */}
                <div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    <h3 className="text-xl text-heading">Medium Risk: Key Loss or Compromise</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Loss of user-controlled encryption keys could result in permanent data inaccessibility, 
                      while key compromise could lead to unauthorized data access.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> Medium (user error) / Low (compromise)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> High (data loss) / High (unauthorized access)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Comprehensive user education on key management</li>
                        <li>Hardware wallet support for enhanced security</li>
                        <li>Key recovery mechanisms (where technically feasible)</li>
                        <li>Multi-signature options for critical operations</li>
                        <li>Clear warnings about key loss consequences</li>
                        <li>Regular security awareness training</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Low Risk */}
                <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-r-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl text-heading">Low Risk: Cross-Border Data Transfers</h3>
                  </div>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Risk Description:</strong>
                      <p className="mt-1">Data transfers outside the EEA require appropriate safeguards to ensure 
                      equivalent data protection standards.</p>
                    </div>
                    <div>
                      <strong className="text-heading">Likelihood:</strong> N/A (operational requirement)
                    </div>
                    <div>
                      <strong className="text-heading">Severity:</strong> Low (with appropriate safeguards)
                    </div>
                    <div>
                      <strong className="text-heading">Mitigation Measures:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Standard Contractual Clauses (SCCs) for all transfers</li>
                        <li>Data Processing Agreements with all processors</li>
                        <li>Encryption in transit and at rest for all transfers</li>
                        <li>Regular compliance audits of third-party processors</li>
                        <li>Transparent disclosure of transfer locations</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Measures to Address Risks */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Measures to Address Risks
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700">
                    <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Technical Measures</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• AES-256-GCM encryption</li>
                    <li>• TLS 1.3 transport security</li>
                    <li>• DID-based authentication</li>
                    <li>• Role-based access controls</li>
                    <li>• Secure key management</li>
                    <li>• Regular security updates</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-secondary-100 rounded-full flex items-center justify-center border border-secondary-200 dark:bg-secondary-900/30 dark:border-secondary-700">
                    <Shield className="w-8 h-8 text-secondary-600 dark:text-secondary-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Organizational Measures</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• Privacy by design principles</li>
                    <li>• Staff training and awareness</li>
                    <li>• Data protection policies</li>
                    <li>• Incident response procedures</li>
                    <li>• Regular compliance audits</li>
                    <li>• Data Protection Officer (DPO)</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-accent-100 rounded-full flex items-center justify-center border border-accent-200 dark:bg-accent-900/30 dark:border-accent-700">
                    <Eye className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                  </div>
                  <h3 className="text-xl text-heading text-center">Monitoring & Review</h3>
                  <ul className="space-y-2 text-body text-sm">
                    <li>• Continuous security monitoring</li>
                    <li>• Regular risk assessments</li>
                    <li>• Audit logging and analysis</li>
                    <li>• Annual DPIA reviews</li>
                    <li>• User feedback mechanisms</li>
                    <li>• Compliance reporting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* No-Content-Logging Policy */}
            <div id="no-content-logging" className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16 scroll-mt-4">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  No-Content-Logging Policy
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <EyeOff className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl text-heading mb-3">Core Principle</h3>
                      <p className="text-body mb-4">
                        SafePsy implements a strict no-content-logging policy to ensure maximum privacy protection. 
                        Sensitive mental health content, therapy session data, and personal communications are never 
                        logged in plaintext or in any form that could be reconstructed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    What We Do NOT Log
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Therapy Content:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Chat messages and conversations between clients and therapists</li>
                        <li>Therapy session notes and assessments</li>
                        <li>Mental health questionnaires and responses</li>
                        <li>Treatment plans and progress notes</li>
                        <li>Any content containing sensitive health information</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Personal Information:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Email addresses (unless explicitly provided for service delivery)</li>
                        <li>IP addresses (disabled by default, privacy-by-design)</li>
                        <li>Wallet addresses in connection with personal data</li>
                        <li>Any personally identifiable information (PII) in logs</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Encrypted Data:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Encrypted chat blobs are never logged</li>
                        <li>Encryption keys are never logged</li>
                        <li>Decryption processes are not logged</li>
                        <li>Key derivation material is not logged</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    What We DO Log (Metadata Only)
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Operational Metadata:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>API endpoint accessed (e.g., /api/chat/save)</li>
                        <li>HTTP method and status codes</li>
                        <li>Request timestamps</li>
                        <li>Response times and performance metrics</li>
                        <li>Error codes (without error message content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Security Events:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Authentication attempts (success/failure, no credentials)</li>
                        <li>Access control violations (metadata only)</li>
                        <li>Rate limiting events</li>
                        <li>Safety violation detections (type only, no content)</li>
                        <li>PII redaction events (that redaction occurred, not the content)</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">System Health:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>System resource usage (CPU, memory, disk)</li>
                        <li>Database connection status</li>
                        <li>Service availability metrics</li>
                        <li>Deployment and configuration changes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-purple-600" />
                    Technical Implementation
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Logging Middleware:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Request/response interceptors filter out sensitive content</li>
                        <li>PII redaction enabled by default in all logs</li>
                        <li>Content sanitization before any logging operations</li>
                        <li>Structured logging with explicit field exclusions</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Privacy Utilities:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>IP hashing disabled by default (no IP logging)</li>
                        <li>PII detection and redaction in log streams</li>
                        <li>Content filtering for sensitive keywords</li>
                        <li>Automatic sanitization of error messages</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Log Storage:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Logs stored in encrypted format</li>
                        <li>Limited retention period (90 days for metadata logs)</li>
                        <li>Access controls on log storage systems</li>
                        <li>Regular audit of logging practices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    Exception Handling
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Security Incidents:</strong>
                      <p className="mt-1 mb-2">
                        In the event of a security incident requiring investigation, the following applies:
                      </p>
                      <ul className="ml-6 list-disc space-y-1">
                        <li>Only metadata and non-sensitive information may be logged for incident response</li>
                        <li>Any exception to no-content-logging requires DPO approval</li>
                        <li>Incident logs are subject to strict access controls</li>
                        <li>Incident logs are deleted immediately after investigation completion</li>
                        <li>All exceptions are documented and audited</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Legal Requirements:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Compliance with legal obligations may require limited logging</li>
                        <li>Any legal exception must be approved by legal counsel and DPO</li>
                        <li>Legal logging is minimized to absolute necessity</li>
                        <li>Legal logs are subject to enhanced security measures</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-emerald-600" />
                    Compliance and Monitoring
                  </h3>
                  <div className="space-y-4 text-body">
                    <div>
                      <strong className="text-heading">Regular Audits:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>Quarterly review of logging practices and configurations</li>
                        <li>Verification that no sensitive content is being logged</li>
                        <li>Review of exception requests and approvals</li>
                        <li>Assessment of log retention and deletion practices</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Privacy Impact:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>No-content-logging policy reduces privacy risks significantly</li>
                        <li>Eliminates risk of sensitive data exposure through log files</li>
                        <li>Prevents unauthorized access to therapy content via logs</li>
                        <li>Supports compliance with GDPR data minimization principles</li>
                      </ul>
                    </div>
                    <div>
                      <strong className="text-heading">Documentation:</strong>
                      <ul className="mt-2 ml-6 list-disc space-y-1">
                        <li>This policy is documented in technical specifications</li>
                        <li>All developers receive training on no-content-logging requirements</li>
                        <li>Code reviews include verification of logging practices</li>
                        <li>Policy violations are treated as security incidents</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GDPR Compliance Review */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Comprehensive GDPR Compliance Review
                </span>
              </h2>
              
              <div className="space-y-12">
                {/* GDPR Principles - Article 5 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-blue-600" />
                    Article 5: Principles Relating to Processing of Personal Data
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">1. Lawfulness, Fairness, and Transparency</h4>
                        <p className="text-sm text-body">SafePsy ensures all processing is lawful, fair, and transparent through:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Clear privacy notices explaining data processing</li>
                          <li>Explicit consent mechanisms for sensitive data</li>
                          <li>Transparent terms of service and privacy policies</li>
                          <li>Regular privacy policy updates and notifications</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">2. Purpose Limitation</h4>
                        <p className="text-sm text-body">Data collected only for specified, explicit, and legitimate purposes:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Data processing limited to therapy service provision</li>
                          <li>No secondary use without explicit consent</li>
                          <li>Clear purpose specification in privacy notices</li>
                          <li>Technical controls preventing unauthorized use</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">3. Data Minimization</h4>
                        <p className="text-sm text-body">Only necessary data collected and processed:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Minimal data collection for service provision</li>
                          <li>Regular audits to ensure minimization compliance</li>
                          <li>No collection of unnecessary personal information</li>
                          <li>Data collection limited to therapy-relevant information</li>
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">4. Accuracy</h4>
                        <p className="text-sm text-body">Personal data kept accurate and up-to-date:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>User-controlled data correction mechanisms</li>
                          <li>Real-time data update capabilities</li>
                          <li>Data integrity verification using SHA-256</li>
                          <li>Regular data accuracy reviews</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">5. Storage Limitation</h4>
                        <p className="text-sm text-body">Data retained only as long as necessary:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>7-year retention for health records (regulatory requirement)</li>
                          <li>30-day retention for communication data (user-configurable)</li>
                          <li>Automated deletion after retention periods</li>
                          <li>User-controlled immediate deletion option</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">6. Integrity and Confidentiality</h4>
                        <p className="text-sm text-body">Data processed securely with appropriate safeguards:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>AES-256-GCM encryption for data at rest</li>
                          <li>TLS 1.3 for data in transit</li>
                          <li>DID-based access control</li>
                          <li>Comprehensive security measures and monitoring</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                        <h4 className="font-semibold text-heading mb-2">7. Accountability</h4>
                        <p className="text-sm text-body">Controller responsible for and demonstrates compliance:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Comprehensive documentation of processing activities</li>
                          <li>Regular compliance audits and assessments</li>
                          <li>Data Protection Officer oversight</li>
                          <li>This DPIA as evidence of accountability</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lawfulness of Processing - Article 6 */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                    Article 6: Lawfulness of Processing
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-100 dark:border-green-900">
                      <h4 className="font-semibold text-heading mb-3">Legal Bases Used by SafePsy</h4>
                      <div className="space-y-4">
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(a) - Consent</strong>
                          <p className="text-sm text-body mt-1">Explicit, informed consent obtained for all non-essential processing activities. Users can withdraw consent at any time through granular consent controls.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(b) - Contract</strong>
                          <p className="text-sm text-body mt-1">Processing necessary for performance of therapy service contracts. All contract terms clearly specify data processing requirements.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 6(1)(f) - Legitimate Interests</strong>
                          <p className="text-sm text-body mt-1">Used for platform security, fraud prevention, and service improvement. Legitimate interests balancing test conducted and documented. Users can object to processing.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-green-100 dark:border-green-900">
                      <h4 className="font-semibold text-heading mb-3">Special Categories - Article 9</h4>
                      <div className="space-y-4">
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(a) - Explicit Consent</strong>
                          <p className="text-sm text-body mt-1">Explicit consent obtained for processing sensitive health data. Consent is specific, informed, and unambiguous. Clear explanation of risks provided.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(c) - Vital Interests</strong>
                          <p className="text-sm text-body mt-1">Processing permitted when necessary to protect vital interests in emergency mental health situations. Strict protocols in place for such scenarios.</p>
                        </div>
                        <div>
                          <strong className="text-heading text-sm">Article 9(2)(h) - Health Care</strong>
                          <p className="text-sm text-body mt-1">Processing for preventive medicine, medical diagnosis, and provision of health care. All processing conducted by qualified health professionals or under their supervision.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Subject Rights - Articles 12-23 */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Users className="w-7 h-7 text-purple-600" />
                    Articles 12-23: Data Subject Rights
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 12 - Transparent Information</h4>
                      <p className="text-sm text-body mb-3">Clear, concise, and easily accessible privacy information provided in plain language.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Privacy notices in multiple languages</li>
                        <li>Visual aids and summaries</li>
                        <li>Regular updates and notifications</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 13 - Information to be Provided</h4>
                      <p className="text-sm text-body mb-3">Comprehensive information provided when collecting data directly from data subjects.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Identity and contact details of controller</li>
                        <li>DPO contact information</li>
                        <li>Purposes and legal basis</li>
                        <li>Recipients and retention periods</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 14 - Information When Not Obtained Directly</h4>
                      <p className="text-sm text-body mb-3">Information provided when data obtained from third parties within one month.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Source of personal data disclosed</li>
                        <li>Categories of data explained</li>
                        <li>All required information provided</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 15 - Right of Access</h4>
                      <p className="text-sm text-body mb-3">Data subjects can access their personal data within 30 days.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Complete data export via encrypted APIs</li>
                        <li>Machine-readable format (JSON/XML)</li>
                        <li>Processing purposes and legal basis</li>
                        <li>Retention period information</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 16 - Right to Rectification</h4>
                      <p className="text-sm text-body mb-3">Data subjects can correct inaccurate or incomplete data.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Real-time data correction mechanisms</li>
                        <li>Cryptographic integrity verification</li>
                        <li>Immediate update processing</li>
                        <li>Notification of corrections to recipients</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 17 - Right to Erasure</h4>
                      <p className="text-sm text-body mb-3">"Right to be forgotten" implemented with cryptographic data deletion.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Complete data removal from all systems</li>
                        <li>Deletion from backups and archives</li>
                        <li>Notification to third-party processors</li>
                        <li>Exceptions for legal obligations documented</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 18 - Right to Restriction</h4>
                      <p className="text-sm text-body mb-3">Data subjects can restrict processing in specific circumstances.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Technical controls for processing restriction</li>
                        <li>Notification of restriction to recipients</li>
                        <li>Clear restriction request mechanisms</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 20 - Right to Data Portability</h4>
                      <p className="text-sm text-body mb-3">Data provided in structured, commonly used, machine-readable format.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>JSON and XML export formats</li>
                        <li>Complete data export including metadata</li>
                        <li>Direct transmission to another controller (where feasible)</li>
                        <li>No excessive technical barriers</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 21 - Right to Object</h4>
                      <p className="text-sm text-body mb-3">Data subjects can object to processing based on legitimate interests.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Clear objection mechanisms</li>
                        <li>Immediate processing cessation upon objection</li>
                        <li>Right to object to direct marketing</li>
                        <li>Balancing test documentation</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 22 - Automated Decision-Making</h4>
                      <p className="text-sm text-body mb-3">No solely automated decision-making with legal or significant effects.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Human review for all significant decisions</li>
                        <li>Transparent AI-assisted tools (not automated decisions)</li>
                        <li>Right to human intervention</li>
                        <li>Right to contest automated decisions</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                      <h4 className="font-semibold text-heading mb-3">Article 23 - Restrictions</h4>
                      <p className="text-sm text-body mb-3">Any restrictions on data subject rights are lawful, necessary, and proportionate.</p>
                      <ul className="text-xs text-body space-y-1 ml-4 list-disc">
                        <li>Restrictions only for legal compliance</li>
                        <li>Documentation of restriction justifications</li>
                        <li>Minimal impact on data subject rights</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Controller and Processor Obligations */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-orange-600" />
                    Articles 24-43: Controller and Processor Obligations
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 24 - Responsibility of Controller</h4>
                        <p className="text-sm text-body">SafePsy implements appropriate technical and organizational measures:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Privacy by design and by default implementation</li>
                          <li>Regular risk assessments and security audits</li>
                          <li>Comprehensive data protection policies</li>
                          <li>Staff training and awareness programs</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 25 - Data Protection by Design and by Default</h4>
                        <p className="text-sm text-body">Privacy integrated into system design from the outset:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>End-to-end encryption by default</li>
                          <li>Minimal data collection as default setting</li>
                          <li>User-controlled privacy settings</li>
                          <li>Privacy impact assessments for new features</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 28 - Processor</h4>
                        <p className="text-sm text-body">All processors bound by data processing agreements:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Standard Contractual Clauses (SCCs) with all processors</li>
                          <li>Clear processor obligations and restrictions</li>
                          <li>Regular processor compliance audits</li>
                          <li>Sub-processor approval requirements</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 30 - Records of Processing Activities</h4>
                        <p className="text-sm text-body">Comprehensive records maintained of all processing activities:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Detailed processing activity logs</li>
                          <li>Categories of data subjects and personal data</li>
                          <li>Recipients and transfer information</li>
                          <li>Retention periods and security measures</li>
                        </ul>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 32 - Security of Processing</h4>
                        <p className="text-sm text-body">Appropriate technical and organizational measures implemented:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Pseudonymization and encryption of personal data</li>
                          <li>Confidentiality, integrity, and availability of systems</li>
                          <li>Regular testing and evaluation of security measures</li>
                          <li>Incident response and recovery procedures</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 33 - Breach Notification to Authority</h4>
                        <p className="text-sm text-body">Personal data breaches reported within 72 hours:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Immediate breach detection and assessment</li>
                          <li>Notification to supervisory authority within 72 hours</li>
                          <li>Comprehensive breach documentation</li>
                          <li>Impact assessment and mitigation measures</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 34 - Breach Notification to Data Subject</h4>
                        <p className="text-sm text-body">High-risk breaches communicated to data subjects without delay:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Clear and plain language breach notifications</li>
                          <li>Description of nature and likely consequences</li>
                          <li>Measures taken or proposed to address breach</li>
                          <li>Contact information for further inquiries</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-orange-100 dark:border-orange-900">
                        <h4 className="font-semibold text-heading mb-3">Article 35 - Data Protection Impact Assessment</h4>
                        <p className="text-sm text-body">This DPIA demonstrates compliance with Article 35 requirements:</p>
                        <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                          <li>Systematic description of processing operations</li>
                          <li>Assessment of necessity and proportionality</li>
                          <li>Risk assessment and mitigation measures</li>
                          <li>Regular review and update procedures</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Protection Officer - Articles 37-39 */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Eye className="w-7 h-7 text-teal-600" />
                    Articles 37-39: Data Protection Officer
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 37 - Designation</h4>
                      <p className="text-sm text-body">SafePsy has designated a Data Protection Officer due to:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Processing of sensitive health data (Article 9)</li>
                        <li>Large-scale systematic monitoring</li>
                        <li>Core activities requiring regular monitoring</li>
                        <li>DPO contact information publicly available</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 38 - Position</h4>
                      <p className="text-sm text-body">DPO operates with independence and expertise:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Direct reporting to highest management level</li>
                        <li>No conflicts of interest</li>
                        <li>Appropriate resources and support</li>
                        <li>Professional secrecy and confidentiality</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-teal-100 dark:border-teal-900">
                      <h4 className="font-semibold text-heading mb-3">Article 39 - Tasks</h4>
                      <p className="text-sm text-body">DPO performs comprehensive compliance tasks:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Inform and advise on GDPR obligations</li>
                        <li>Monitor GDPR compliance</li>
                        <li>Provide advice on DPIAs</li>
                        <li>Cooperate with supervisory authorities</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Transfers of Personal Data - Articles 44-49 */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Database className="w-7 h-7 text-red-600" />
                    Articles 44-49: Transfers of Personal Data to Third Countries
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 44 - General Principle</h4>
                      <p className="text-sm text-body">All transfers subject to GDPR Chapter V requirements:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Transfers only with appropriate safeguards</li>
                        <li>Comprehensive transfer documentation</li>
                        <li>Regular transfer risk assessments</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 45 - Adequacy Decision</h4>
                      <p className="text-sm text-body">Transfers to countries with adequacy decisions:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Monitoring of adequacy decision status</li>
                        <li>Preference for adequate countries where possible</li>
                        <li>Documentation of adequacy-based transfers</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 46 - Appropriate Safeguards</h4>
                      <p className="text-sm text-body">Standard Contractual Clauses (SCCs) used for transfers:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>EU Standard Contractual Clauses (2021 version)</li>
                        <li>Binding Corporate Rules where applicable</li>
                        <li>Additional technical safeguards (encryption)</li>
                        <li>Regular review of transfer mechanisms</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-red-100 dark:border-red-900">
                      <h4 className="font-semibold text-heading mb-3">Article 49 - Derogations</h4>
                      <p className="text-sm text-body">Specific derogations used only when necessary:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Explicit consent for specific transfers</li>
                        <li>Contract performance necessity</li>
                        <li>Important reasons of public interest</li>
                        <li>Documentation of derogation use</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Codes of Conduct and Certification - Articles 40-43 */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-8">
                  <h3 className="text-2xl text-heading mb-6 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-indigo-600" />
                    Articles 40-43: Codes of Conduct and Certification
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="font-semibold text-heading mb-3">Article 40 - Codes of Conduct</h4>
                      <p className="text-sm text-body">SafePsy adheres to relevant industry codes:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>Mental health professional codes of ethics</li>
                        <li>Healthcare data protection standards</li>
                        <li>Technology industry best practices</li>
                        <li>Regular code compliance reviews</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="font-semibold text-heading mb-3">Article 42 - Certification</h4>
                      <p className="text-sm text-body">Pursuing relevant certifications:</p>
                      <ul className="mt-2 text-sm text-body space-y-1 ml-4 list-disc">
                        <li>ISO 27001 Information Security Management</li>
                        <li>ISO 27701 Privacy Information Management</li>
                        <li>Healthcare-specific certifications</li>
                        <li>Regular certification audits</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                    <h3 className="text-2xl text-heading">GDPR Compliance Summary</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-emerald-100 dark:border-emerald-900">
                    <p className="text-body mb-4">
                      SafePsy demonstrates comprehensive compliance with the General Data Protection Regulation (GDPR) through:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2 text-body text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Full implementation of GDPR principles (Article 5)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Lawful processing with appropriate legal bases (Articles 6, 9)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Complete data subject rights implementation (Articles 12-23)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Privacy by design and by default (Article 25)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Comprehensive security measures (Article 32)</span>
                        </li>
                      </ul>
                      <ul className="space-y-2 text-body text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Data Protection Impact Assessments (Article 35 - this document)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Data Protection Officer oversight (Articles 37-39)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Breach notification procedures (Articles 33-34)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Secure cross-border transfers (Articles 44-49)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>Records of processing activities (Article 30)</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-body font-medium">
                        This comprehensive GDPR compliance review demonstrates SafePsy's commitment to protecting personal data 
                        and respecting data subject rights in accordance with all applicable GDPR requirements. Compliance is 
                        continuously monitored, reviewed, and improved through regular audits and assessments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultation */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Consultation
                </span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Data Protection Officer (DPO)</h3>
                  <p className="text-body mb-4">
                    SafePsy has appointed a Data Protection Officer to oversee data protection compliance:
                  </p>
                  <div className="space-y-2 text-body">
                    <p><strong>Contact:</strong> <button onClick={() => navigate('/contact-us')} className="text-primary-600 hover:underline link-hover">Contact Us</button></p>
                    <p><strong>Role:</strong> Independent oversight of data protection practices, risk assessments, and compliance monitoring</p>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Stakeholder Consultation</h3>
                  <p className="text-body mb-4">
                    This DPIA has been developed in consultation with:
                  </p>
                  <ul className="space-y-2 text-body ml-6 list-disc">
                    <li>Data Protection Officer</li>
                    <li>Security and Privacy Team</li>
                    <li>Legal and Compliance Team</li>
                    <li>Technical Architecture Team</li>
                    <li>User representatives (where applicable)</li>
                  </ul>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Supervisory Authority Consultation</h3>
                  <p className="text-body">
                    Where required under GDPR Article 36, SafePsy will consult with the relevant supervisory authority 
                    (e.g., ICO in the UK, CNIL in France) before commencing high-risk processing activities. This DPIA 
                    will be made available to supervisory authorities upon request.
                  </p>
                </div>
              </div>
            </div>

            {/* Sign-off and Approval */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 lg:p-16 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-12 text-center">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Sign-off and Approval
                </span>
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                  <h3 className="text-xl text-heading mb-4">Approval Status</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-body font-semibold">DPIA Approved and Active</span>
                  </div>
                  <p className="text-body text-sm">
                    This DPIA has been reviewed and approved by the Data Protection Officer and senior management. 
                    It will be reviewed annually or when significant changes occur to processing activities.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg text-heading mb-2">Data Protection Officer</h4>
                    <p className="text-body text-sm mb-4">Review and approval of DPIA</p>
                    <p className="text-body text-xs text-gray-500">Status: Approved</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg text-heading mb-2">Chief Technology Officer</h4>
                    <p className="text-body text-sm mb-4">Technical risk assessment and mitigation</p>
                    <p className="text-body text-xs text-gray-500">Status: Approved</p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <h3 className="text-lg text-heading mb-2">Next Review Date</h3>
                  <p className="text-body">
                    This DPIA will be reviewed on or before{' '}
                    <strong>{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>, 
                    or earlier if significant changes occur to processing activities, technology, or regulatory requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl text-heading mb-6">
                Questions About This DPIA?
              </h2>
              <p className="text-lg text-body mb-8 max-w-2xl mx-auto">
                For questions about this Data Protection Impact Assessment or our data protection practices, 
                please contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/contact-us')}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  Contact Us
                </button>
                <button
                  onClick={() => navigate('/sap-policy')}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 min-h-[44px]"
                >
                  View Security and Privacy Policy
                </button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default DPIA

