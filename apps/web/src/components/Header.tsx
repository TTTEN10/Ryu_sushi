import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import ConnectWallet from './ConnectWallet'

interface HeaderProps {
  showBackButton?: boolean
  showTagline?: boolean
}

const Header: React.FC<HeaderProps> = () => {
  const { pathname } = useLocation()
  const showTryBeta = pathname === '/'

  return (
    <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 fade-in">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-heading text-base sm:text-lg">
          <Link to="/" className="h-10 sm:h-12 transition-all duration-300 min-h-[44px] flex items-center group">
            <img src="/LogoTransparent1.png" alt="SafePsy Logo" className="h-10 sm:h-12 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-105" />
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {showTryBeta ? (
            <Link
              to="/beta/chat"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl min-h-[44px] text-sm sm:text-base hover:scale-105 active:scale-95"
              aria-label="Try SafePsy beta chat"
            >
              Try beta
            </Link>
          ) : (
            <ConnectWallet />
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
