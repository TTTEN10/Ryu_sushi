import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import ConnectWallet from './ConnectWallet'
import PlanBadge from './PlanBadge'
import SubscriptionTerminal from './SubscriptionTerminal'
import { useSubscriptionTerminal } from '../contexts/SubscriptionTerminalContext'

const Header: React.FC = () => {
  const { pathname } = useLocation()
  const showTryBeta = pathname === '/'
  const isBetaChat = pathname === '/beta'
  const {
    showSubscriptionTerminal,
    subscriptionTerminalForced,
    openSubscriptionTerminal,
  } = useSubscriptionTerminal()

  return (
    <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2 sm:py-3 fade-in">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-heading text-base sm:text-lg">
          <Link to="/" className="h-10 sm:h-12 transition-all duration-300 min-h-[44px] flex items-center group">
            <img
              src="/LogoTransparent1.png"
              alt="SafePsy Logo"
              className="h-10 sm:h-12 transition-all duration-300 group-hover:drop-shadow-lg group-hover:scale-105"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
          {/* Primary action (desktop & mobile) */}
          {showTryBeta ? (
            <Link to="/beta" className="btn-try-beta" aria-label="Try the SafePsy beta chat">
              Try beta
              <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}

          {isBetaChat ? (
            <div id="wallet-connect-region" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
              <PlanBadge onOpenTerminal={() => openSubscriptionTerminal()} />
              <div className="flex min-w-0 shrink">
                <ConnectWallet variant="header" />
              </div>
              {showSubscriptionTerminal && (
                <SubscriptionTerminal
                  forced={subscriptionTerminalForced}
                  onActivate={() => openSubscriptionTerminal(false)}
                  onClose={() => openSubscriptionTerminal(false)}
                />
              )}
            </div>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default Header