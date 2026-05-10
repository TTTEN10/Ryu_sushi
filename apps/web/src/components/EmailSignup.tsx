import React from 'react'
import WaitlistForm from './WaitlistForm'

const EmailSignup: React.FC = () => {
  return (
    <section className="section-padding py-16 lg:py-20 bg-white/40 backdrop-blur-sm fade-in">
      <div className="container-max">
        <div className="max-w-4xl mx-auto text-center">
          <div className="space-y-8">
            <div className="max-w-2xl mx-auto text-left">
              <WaitlistForm
                title="Be the first to know"
                subtitle="Join our waitlist to get early access to SafePsy and be part of the privacy-first therapy revolution."
              />
            </div>

            <p className="text-sm text-web-safe max-w-md mx-auto">
              We respect your privacy. Your email will only be used to notify you
              about SafePsy updates and early access opportunities.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EmailSignup
