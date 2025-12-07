import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import ConnectWallet from './ConnectWallet'
import { useEscapeKey, useFocusTrap } from '../hooks/useKeyboardNavigation'

interface HeaderProps {
  showBackButton?: boolean
  showTagline?: boolean
}

const Header: React.FC<HeaderProps> = ({ 
  showBackButton = false, 
  showTagline = false 
}) => {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuContainerRef = useFocusTrap(isMobileMenuOpen)

  useEscapeKey(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  })

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const closeMenu = () => setIsMobileMenuOpen(false)

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about-us', label: 'About Us' },
    { to: '/contact-us', label: 'Contact' },
    { to: '/sap-policy', label: 'Privacy Policy' },
    { to: '/tos', label: 'Terms of Service' },
    { to: '/dpia', label: 'DPIA' },
  ]

  return (
    <>
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 fade-in">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 text-heading text-base sm:text-lg">
            <Link to="/" className="h-10 sm:h-12 transition-all duration-300 min-h-[44px] flex items-center group">
              <img src="/LogoTransparent1.png" alt="SafePsy Logo" className="h-10 sm:h-12 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-105" />
            </Link>
          </div>
          
          {showTagline && (
            <p className="text-sm sm:text-[1.1em] text-web-safe hidden md:block fade-in">
              Safe Online-Therapy
            </p>
          )}
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-body hover:text-primary-600 transition-colors duration-200 link-hover"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {showBackButton && (
              <button 
                onClick={() => navigate('/')}
                className="hidden sm:flex items-center gap-1 sm:gap-2 text-sm sm:text-[1.1em] text-web-safe hover:text-primary-600 transition-all duration-300 min-h-[44px] min-w-[44px] px-2 sm:px-0 group hover:scale-105 active:scale-95"
                aria-label="Back to Home"
              >
                <ArrowLeft className="w-4 h-4 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            )}
            <ConnectWallet />
            <ThemeToggle />
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-body hover:text-primary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <div
            ref={menuContainerRef as any}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-heading">Menu</h2>
                <button
                  onClick={closeMenu}
                  className="p-2 text-body hover:text-primary-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-4 space-y-2">
                {showBackButton && (
                  <button
                    onClick={() => {
                      navigate('/')
                      closeMenu()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-body hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px]"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                  </button>
                )}
                
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className="block px-4 py-3 text-body hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px] flex items-center"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-body">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default Header
