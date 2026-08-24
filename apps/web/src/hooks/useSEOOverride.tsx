import React, { createContext, useContext } from 'react'
import { SEOConfig } from '../types/seo'

const SEOOverrideContext = createContext<SEOConfig | null>(null)

export function SEOOverrideProvider({
  children,
  config,
}: {
  children: React.ReactNode
  config: SEOConfig
}) {
  return (
    <SEOOverrideContext.Provider value={config}>
      {children}
    </SEOOverrideContext.Provider>
  )
}

export function useSEOOverride(): SEOConfig | null {
  return useContext(SEOOverrideContext)
}