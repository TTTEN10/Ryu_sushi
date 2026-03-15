import React, { useState } from 'react'
import { Mail, Instagram, Linkedin, Settings, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CookieManager from './CookieManager'

const Footer: React.FC = () => {
  const navigate = useNavigate()
  const [isCookieManagerOpen, setIsCookieManagerOpen] = useState(false)

  return (
    <footer className="fade-in">
      <div className="container-max section-padding py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 md:col-span-2">
            <a
              href="https://safepsy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 sm:h-12 hover:drop-shadow-lg transition-all duration-300 inline-block group"
            >
              <img src="/LogoTransparent1.png" alt="SafePsy Logo" className="h-10 sm:h-12 transition-transform duration-300 group-hover:scale-105" />
            </a>
            <p className="text-text-primary font-titillium font-regular text-base sm:text-[1.1em]">
              Mental Health, Rebuilt on Privacy
            </p>
          </div>

          {/* Contact Links */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-base sm:text-lg font-titillium font-semibold text-text-primary dark:text-white">Contact</h4>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => navigate('/contact-us')}
                className="flex items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
                aria-label="Contact us"
              >
                <Mail className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300">
                  Contact
                </span>
              </button>
              <button
                onClick={() => navigate('/faq')}
                className="flex items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
                aria-label="FAQ"
              >
                <HelpCircle className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300">
                  FAQ
                </span>
              </button>
              <a
                href="https://instagram.com/safepsy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <span className="dark:text-white">@safepsy</span>
              </a>
              <a
                href="https://linkedin.com/company/safepsy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 sm:gap-3 text-text-primary hover:text-primary-600 transition-all duration-300 font-titillium font-regular min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin className="w-5 h-5 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="dark:text-white">SafePsy</span>
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-base sm:text-lg font-titillium font-semibold text-text-primary dark:text-white">Legal</h4>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/tos')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300 link-hover">
                  Terms of Service & Privacy Policy
                </span>
              </button>
              <button 
                onClick={() => navigate('/sap-policy')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300 link-hover">
                  Security and Privacy Policy
                </span>
              </button>
              <button 
                onClick={() => navigate('/cookies')}
                className="text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left block min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
              >
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300 link-hover">
                  Cookie Policy
                </span>
              </button>
              <button 
                onClick={() => setIsCookieManagerOpen(true)}
                className="flex items-center gap-2 text-text-primary font-titillium font-regular hover:text-primary-600 transition-all duration-300 text-left min-h-[44px] text-sm sm:text-base group hover:scale-105 active:scale-95"
              >
                <Settings className="w-4 h-4 dark:text-white flex-shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                <span className="text-black dark:text-white hover:text-primary-600 transition-all duration-300 link-hover">
                  Cookie Preferences
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-text-primary/20 dark:border-white/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center space-y-2">
          <p className="text-text-primary text-xs sm:text-sm font-noto font-light px-4">
            Built with privacy, security, and human-centered design.
          </p>
          <p className="text-text-primary text-xs sm:text-sm font-titillium font-regular px-4">
            © 2026 SafePsy. All rights reserved.
          </p>
        </div>
      </div>
      
      {/* Cookie Manager Modal */}
      <CookieManager 
        isOpen={isCookieManagerOpen} 
        onClose={() => setIsCookieManagerOpen(false)} 
      />
    </footer>
  )
}

export default Footer
